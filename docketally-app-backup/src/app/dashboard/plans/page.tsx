"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  user_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanGoal {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  description: string | null;
  success_criteria: string | null;
  deadline: string | null;
  status: string;
  original_description: string | null;
  revised_date: string | null;
  revision_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanCheckin {
  id: string;
  plan_id: string;
  user_id: string;
  date: string;
  summary: string;
  manager_feedback: string | null;
  your_notes: string | null;
  linked_record_id: string | null;
  created_at: string;
}

interface DocketRecord {
  id: string;
  title: string;
  date: string;
  entry_type: string;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
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
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  color: "#1C1917",
  outline: "none",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: "vertical" as const,
  lineHeight: 1.6,
};

const btnGreen: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-green)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  background: "#fff",
  color: "#44403C",
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid var(--color-stone-200)",
  padding: "24px",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getStatusBadge(status: string): React.CSSProperties {
  if (status === "met" || status === "completed") {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      textTransform: "uppercase",
      color: "#15803D",
      background: "#F0FDF4",
      border: "1px solid #BBF7D0",
    };
  }
  if (status === "not_met" || status === "expired") {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      textTransform: "uppercase",
      color: "#991B1B",
      background: "#FEF2F2",
      border: "1px solid #FECACA",
    };
  }
  if (status === "revised") {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 600,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.02em",
      textTransform: "uppercase",
      color: "#92400E",
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
    };
  }
  // in_progress / active
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: "#57534E",
    background: "#F5F5F4",
    border: "1px solid #E7E5E4",
  };
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlansPage() {
  const supabase = createClient();

  /* ----- state ----- */
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [checkins, setCheckins] = useState<PlanCheckin[]>([]);
  const [records, setRecords] = useState<DocketRecord[]>([]);

  // forms
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    plan_name: "Performance Improvement Plan",
    start_date: todayStr(),
    end_date: "",
    notes: "",
  });
  const [editingPlan, setEditingPlan] = useState(false);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    success_criteria: "",
    deadline: "",
    status: "in_progress",
  });

  const [showReviseForm, setShowReviseForm] = useState<string | null>(null);
  const [reviseForm, setReviseForm] = useState({
    new_description: "",
    revision_notes: "",
    revised_date: todayStr(),
  });

  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    date: todayStr(),
    summary: "",
    manager_feedback: "",
    your_notes: "",
    linked_record_id: "",
  });

  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ----- auth ----- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase.auth]);

  /* ----- data fetch ----- */
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [planRes, recordsRes] = await Promise.all([
      supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("records")
        .select("id, title, date, entry_type")
        .eq("user_id", userId)
        .order("date", { ascending: false }),
    ]);

    const activePlan = planRes.data?.[0] ?? null;
    setPlan(activePlan);
    setRecords(recordsRes.data ?? []);

    if (activePlan) {
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase
          .from("plan_goals")
          .select("*")
          .eq("plan_id", activePlan.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("plan_checkins")
          .select("*")
          .eq("plan_id", activePlan.id)
          .order("date", { ascending: false }),
      ]);
      setGoals(goalsRes.data ?? []);
      setCheckins(checkinsRes.data ?? []);
    } else {
      setGoals([]);
      setCheckins([]);
    }

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  /* ----- plan progress ----- */
  const planProgress = useMemo(() => {
    if (!plan) return { daysRemaining: 0, totalDays: 0, pct: 0 };
    const start = new Date(plan.start_date + "T00:00:00").getTime();
    const end = new Date(plan.end_date + "T00:00:00").getTime();
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed = Math.round((now - start) / 86400000);
    const daysRemaining = Math.max(0, totalDays - elapsed);
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    return { daysRemaining, totalDays, pct };
  }, [plan]);

  const planStatus = useMemo(() => {
    if (!plan) return "active";
    if (plan.status === "completed") return "completed";
    const end = new Date(plan.end_date + "T00:00:00").getTime();
    if (Date.now() > end) return "expired";
    return "active";
  }, [plan]);

  /* ----- goal revisions ----- */
  const revisions = useMemo(() => {
    return goals
      .filter((g) => g.original_description && g.revised_date)
      .map((g) => ({
        goalId: g.id,
        goalTitle: g.title,
        date: g.revised_date!,
        original: g.original_description!,
        revised: g.description || "",
        notes: g.revision_notes || "",
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [goals]);

  /* ----- handlers ----- */
  async function savePlan() {
    if (!userId || !planForm.start_date || !planForm.end_date) return;
    setSaving(true);

    if (editingPlan && plan) {
      await supabase
        .from("plans")
        .update({
          plan_name: planForm.plan_name,
          start_date: planForm.start_date,
          end_date: planForm.end_date,
          notes: planForm.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
    } else {
      await supabase.from("plans").insert({
        user_id: userId,
        plan_name: planForm.plan_name,
        start_date: planForm.start_date,
        end_date: planForm.end_date,
        notes: planForm.notes || null,
      });
    }

    setShowPlanForm(false);
    setEditingPlan(false);
    setSaving(false);
    await fetchAll();
  }

  async function markPlanComplete() {
    if (!plan) return;
    setSaving(true);
    await supabase
      .from("plans")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    setSaving(false);
    await fetchAll();
  }

  async function saveGoal() {
    if (!userId || !plan || !goalForm.title) return;
    setSaving(true);

    if (editingGoalId) {
      await supabase
        .from("plan_goals")
        .update({
          title: goalForm.title,
          description: goalForm.description || null,
          success_criteria: goalForm.success_criteria || null,
          deadline: goalForm.deadline || null,
          status: goalForm.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingGoalId);
    } else {
      await supabase.from("plan_goals").insert({
        plan_id: plan.id,
        user_id: userId,
        title: goalForm.title,
        description: goalForm.description || null,
        success_criteria: goalForm.success_criteria || null,
        deadline: goalForm.deadline || null,
      });
    }

    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalForm({ title: "", description: "", success_criteria: "", deadline: "", status: "in_progress" });
    setSaving(false);
    await fetchAll();
  }

  async function reviseGoal(goalId: string) {
    if (!reviseForm.new_description) return;
    setSaving(true);

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    await supabase
      .from("plan_goals")
      .update({
        original_description: goal.original_description || goal.description,
        description: reviseForm.new_description,
        revised_date: reviseForm.revised_date,
        revision_notes: reviseForm.revision_notes || null,
        status: "revised",
        updated_at: new Date().toISOString(),
      })
      .eq("id", goalId);

    setShowReviseForm(null);
    setReviseForm({ new_description: "", revision_notes: "", revised_date: todayStr() });
    setSaving(false);
    await fetchAll();
  }

  async function deleteGoal(goalId: string) {
    setSaving(true);
    await supabase.from("plan_goals").delete().eq("id", goalId);
    setSaving(false);
    await fetchAll();
  }

  async function saveCheckin() {
    if (!userId || !plan || !checkinForm.summary) return;
    setSaving(true);

    await supabase.from("plan_checkins").insert({
      plan_id: plan.id,
      user_id: userId,
      date: checkinForm.date,
      summary: checkinForm.summary,
      manager_feedback: checkinForm.manager_feedback || null,
      your_notes: checkinForm.your_notes || null,
      linked_record_id: checkinForm.linked_record_id || null,
    });

    setShowCheckinForm(false);
    setCheckinForm({ date: todayStr(), summary: "", manager_feedback: "", your_notes: "", linked_record_id: "" });
    setSaving(false);
    await fetchAll();
  }

  async function deleteCheckin(checkinId: string) {
    setSaving(true);
    await supabase.from("plan_checkins").delete().eq("id", checkinId);
    setSaving(false);
    await fetchAll();
  }

  function openEditGoal(goal: PlanGoal) {
    setEditingGoalId(goal.id);
    setGoalForm({
      title: goal.title,
      description: goal.description || "",
      success_criteria: goal.success_criteria || "",
      deadline: goal.deadline || "",
      status: goal.status,
    });
    setShowGoalForm(true);
  }

  function openReviseGoal(goal: PlanGoal) {
    setReviseForm({
      new_description: goal.description || "",
      revision_notes: "",
      revised_date: todayStr(),
    });
    setShowReviseForm(goal.id);
  }

  function openEditPlan() {
    if (!plan) return;
    setPlanForm({
      plan_name: plan.plan_name,
      start_date: plan.start_date,
      end_date: plan.end_date,
      notes: plan.notes || "",
    });
    setEditingPlan(true);
    setShowPlanForm(true);
  }

  /* ----- focus helper ----- */
  function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--color-green)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.10)";
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#D6D3D1";
    e.currentTarget.style.boxShadow = "none";
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div
        className="da-page-wrapper"
        style={{
          padding: 32,
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
          Loading plans...
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Plan Creation Form                                               */
  /* ---------------------------------------------------------------- */

  if (showPlanForm) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => { setShowPlanForm(false); setEditingPlan(false); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            color: "var(--color-stone-500)",
            marginBottom: 20,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
          {editingPlan ? "Edit Plan" : "Add a Plan"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", marginBottom: 28 }}>
          Enter the details of your performance improvement plan or formal workplace plan.
        </p>

        <div style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Plan Name */}
            <div>
              <label style={labelStyle}>Plan Name</label>
              <input
                type="text"
                value={planForm.plan_name}
                onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {/* Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={planForm.start_date}
                  onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input
                  type="date"
                  value={planForm.end_date}
                  onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                placeholder="Any additional context about the plan"
                style={textareaStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowPlanForm(false); setEditingPlan(false); }}
                style={btnOutline}
              >
                Cancel
              </button>
              <button
                onClick={savePlan}
                disabled={saving || !planForm.start_date || !planForm.end_date}
                style={{
                  ...btnGreen,
                  opacity: saving || !planForm.start_date || !planForm.end_date ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : editingPlan ? "Update Plan" : "Save Plan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Empty State — No Active Plan                                     */
  /* ---------------------------------------------------------------- */

  if (!plan) {
    return (
      <div
        className="da-page-wrapper"
        style={{
          padding: 32,
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 480,
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone-300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "#1C1917", marginBottom: 10 }}>
            No active plan
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", marginBottom: 24 }}>
            If you&apos;ve been placed on a PIP or performance plan, track it here. Log goals, deadlines, and weekly check-ins. Flag when expectations shift.
          </p>
          <button
            onClick={() => {
              setPlanForm({ plan_name: "Performance Improvement Plan", start_date: todayStr(), end_date: "", notes: "" });
              setShowPlanForm(true);
            }}
            style={btnGreen}
          >
            Add a Plan
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Plan Dashboard                                                   */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#1C1917", marginBottom: 8 }}>
          Plans
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
          Track your performance improvement plan, monitor goals, and document check-ins.
        </p>
      </div>

      {/* Auto-generated attorney summary */}
      {(() => {
        const start = new Date(plan.start_date + "T00:00:00");
        const end = new Date(plan.end_date + "T00:00:00");
        const durationDays = Math.round((end.getTime() - start.getTime()) / 86400000);
        const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const goalCount = goals.length;
        const revisionCount = revisions.length;
        const checkinCount = checkins.length;
        const displayStatus = planStatus.charAt(0).toUpperCase() + planStatus.slice(1);

        return (
          <div
            style={{
              background: "var(--color-stone-50)",
              border: "1px solid var(--color-stone-200)",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1C1917",
                fontFamily: "var(--font-sans)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {durationDays}-day PIP ({startStr} – {endStr}) · {goalCount} goal{goalCount !== 1 ? "s" : ""} · {revisionCount} revision{revisionCount !== 1 ? "s" : ""} · {checkinCount} check-in{checkinCount !== 1 ? "s" : ""} · Status: {displayStatus}
            </p>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/*  PLAN HEADER CARD                                             */}
      {/* ============================================================ */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#1C1917", margin: 0 }}>
                {plan.plan_name}
              </h2>
              <span style={getStatusBadge(planStatus)}>{statusLabel(planStatus)}</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", margin: 0 }}>
              {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
              {plan.notes && <span style={{ marginLeft: 12, color: "var(--color-stone-400)" }}>• {plan.notes}</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openEditPlan} style={btnOutline}>
              Edit Plan
            </button>
            {planStatus === "active" && (
              <button
                onClick={markPlanComplete}
                disabled={saving}
                style={{ ...btnOutline, color: "#15803D", borderColor: "#BBF7D0" }}
              >
                {saving ? "..." : "Mark Complete"}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
              Progress
            </span>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#1C1917" }}>
              {planProgress.daysRemaining} day{planProgress.daysRemaining !== 1 ? "s" : ""} remaining
            </span>
          </div>
          <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--color-stone-100)" }}>
            <div
              style={{
                width: `${planProgress.pct}%`,
                height: "100%",
                borderRadius: 3,
                background: planStatus === "expired" ? "#EF4444" : "var(--color-green)",
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)" }}>
              {formatDate(plan.start_date)}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)" }}>
              {formatDate(plan.end_date)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  GOALS SECTION                                                */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", margin: 0 }}>
            Goals
          </h2>
          <button
            onClick={() => {
              setEditingGoalId(null);
              setGoalForm({ title: "", description: "", success_criteria: "", deadline: "", status: "in_progress" });
              setShowGoalForm(true);
            }}
            style={{ ...btnGreen, padding: "8px 16px", fontSize: 13 }}
          >
            Add Goal
          </button>
        </div>

        {/* Goal Form */}
        {showGoalForm && (
          <div style={{ ...cardStyle, marginBottom: 16, border: "1px solid var(--color-green)", borderLeft: "3px solid var(--color-green)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Goal Title</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="e.g., Improve quarterly sales numbers"
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="What is expected?"
                  style={textareaStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>Success Criteria</label>
                <textarea
                  value={goalForm.success_criteria}
                  onChange={(e) => setGoalForm({ ...goalForm, success_criteria: e.target.value })}
                  placeholder="How will success be measured?"
                  style={textareaStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Deadline</label>
                  <input
                    type="date"
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                {editingGoalId && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      value={goalForm.status}
                      onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
                      style={inputStyle}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="met">Met</option>
                      <option value="not_met">Not Met</option>
                      <option value="revised">Revised</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => { setShowGoalForm(false); setEditingGoalId(null); }}
                  style={btnOutline}
                >
                  Cancel
                </button>
                <button
                  onClick={saveGoal}
                  disabled={saving || !goalForm.title}
                  style={{ ...btnGreen, padding: "8px 16px", fontSize: 13, opacity: saving || !goalForm.title ? 0.5 : 1 }}
                >
                  {saving ? "Saving..." : editingGoalId ? "Update Goal" : "Save Goal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Cards */}
        {goals.length === 0 && !showGoalForm ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
              No goals added yet. Add your PIP goals to track progress and flag revisions.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {goals.map((goal) => (
              <div key={goal.id} style={{ ...cardStyle, borderLeft: goal.status === "revised" ? "3px solid #FDE68A" : goal.status === "met" ? "3px solid #BBF7D0" : goal.status === "not_met" ? "3px solid #FECACA" : "3px solid var(--color-stone-200)" }}>
                {/* Goal header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)", margin: 0 }}>
                        {goal.title}
                      </h3>
                      <span style={getStatusBadge(goal.status)}>{statusLabel(goal.status)}</span>
                    </div>
                    {goal.deadline && (
                      <p style={{ fontSize: 12, color: "var(--color-stone-400)", fontFamily: "var(--font-mono)", margin: 0 }}>
                        Deadline: {formatDate(goal.deadline)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => openReviseGoal(goal)}
                      style={{ ...btnOutline, padding: "5px 10px", fontSize: 11, color: "#92400E", borderColor: "#FDE68A" }}
                    >
                      Flag as Revised
                    </button>
                    <button
                      onClick={() => openEditGoal(goal)}
                      style={{ ...btnOutline, padding: "5px 10px", fontSize: 11 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      style={{ ...btnOutline, padding: "5px 10px", fontSize: 11, color: "#991B1B", borderColor: "#FECACA" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Revision display */}
                {goal.original_description && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={getStatusBadge("revised")}>REVISED</span>
                      {goal.revised_date && (
                        <span style={{ fontSize: 11, color: "#92400E", fontFamily: "var(--font-mono)" }}>
                          {formatDate(goal.revised_date)}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.5, textDecoration: "line-through", marginBottom: 6 }}>
                      {goal.original_description}
                    </p>
                    <p style={{ fontSize: 13, color: "#1C1917", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginBottom: 0 }}>
                      {goal.description}
                    </p>
                    {goal.revision_notes && (
                      <p style={{ fontSize: 12, color: "#92400E", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 6, fontStyle: "italic" }}>
                        Note: {goal.revision_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Revise form inline */}
                {showReviseForm === goal.id && (
                  <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "16px", marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#92400E", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                      Flag Goal as Revised
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>New Description</label>
                        <textarea
                          value={reviseForm.new_description}
                          onChange={(e) => setReviseForm({ ...reviseForm, new_description: e.target.value })}
                          placeholder="What is the new expectation?"
                          style={textareaStyle}
                          onFocus={focusInput}
                          onBlur={blurInput}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>What Changed?</label>
                        <textarea
                          value={reviseForm.revision_notes}
                          onChange={(e) => setReviseForm({ ...reviseForm, revision_notes: e.target.value })}
                          placeholder="Describe what shifted and why this matters"
                          style={textareaStyle}
                          onFocus={focusInput}
                          onBlur={blurInput}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Date of Change</label>
                        <input
                          type="date"
                          value={reviseForm.revised_date}
                          onChange={(e) => setReviseForm({ ...reviseForm, revised_date: e.target.value })}
                          style={{ ...inputStyle, maxWidth: 200 }}
                          onFocus={focusInput}
                          onBlur={blurInput}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setShowReviseForm(null)} style={btnOutline}>
                          Cancel
                        </button>
                        <button
                          onClick={() => reviseGoal(goal.id)}
                          disabled={saving || !reviseForm.new_description}
                          style={{ ...btnGreen, padding: "8px 16px", fontSize: 13, background: "#D97706", opacity: saving || !reviseForm.new_description ? 0.5 : 1 }}
                        >
                          {saving ? "Saving..." : "Save Revision"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description & criteria */}
                {!goal.original_description && goal.description && (
                  <p style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.6, marginBottom: goal.success_criteria ? 8 : 0 }}>
                    {goal.description}
                  </p>
                )}
                {goal.success_criteria && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#44403C", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Success Criteria:
                    </span>
                    <p style={{ fontSize: 13, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 4 }}>
                      {goal.success_criteria}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  CHECK-INS SECTION                                            */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", margin: 0 }}>
            Check-Ins
          </h2>
          <button
            onClick={() => {
              setCheckinForm({ date: todayStr(), summary: "", manager_feedback: "", your_notes: "", linked_record_id: "" });
              setShowCheckinForm(true);
            }}
            style={{ ...btnGreen, padding: "8px 16px", fontSize: 13 }}
          >
            Log Check-In
          </button>
        </div>

        {/* Checkin Form */}
        {showCheckinForm && (
          <div style={{ ...cardStyle, marginBottom: 16, border: "1px solid var(--color-green)", borderLeft: "3px solid var(--color-green)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={checkinForm.date}
                  onChange={(e) => setCheckinForm({ ...checkinForm, date: e.target.value })}
                  style={{ ...inputStyle, maxWidth: 200 }}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>What was discussed?</label>
                <textarea
                  value={checkinForm.summary}
                  onChange={(e) => setCheckinForm({ ...checkinForm, summary: e.target.value })}
                  placeholder="Summarize what happened during the check-in"
                  style={textareaStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>Manager Feedback</label>
                <textarea
                  value={checkinForm.manager_feedback}
                  onChange={(e) => setCheckinForm({ ...checkinForm, manager_feedback: e.target.value })}
                  placeholder="What feedback did your manager give?"
                  style={textareaStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>Your Notes</label>
                <textarea
                  value={checkinForm.your_notes}
                  onChange={(e) => setCheckinForm({ ...checkinForm, your_notes: e.target.value })}
                  placeholder="Anything you want to note privately?"
                  style={textareaStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>
              <div>
                <label style={labelStyle}>Link to Record (optional)</label>
                <select
                  value={checkinForm.linked_record_id}
                  onChange={(e) => setCheckinForm({ ...checkinForm, linked_record_id: e.target.value })}
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                >
                  <option value="">None</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.date)} — {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowCheckinForm(false)} style={btnOutline}>
                  Cancel
                </button>
                <button
                  onClick={saveCheckin}
                  disabled={saving || !checkinForm.summary}
                  style={{ ...btnGreen, padding: "8px 16px", fontSize: 13, opacity: saving || !checkinForm.summary ? 0.5 : 1 }}
                >
                  {saving ? "Saving..." : "Save Check-In"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkin list */}
        {checkins.length === 0 && !showCheckinForm ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)" }}>
              No check-ins logged yet. Document your PIP meetings and progress updates here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checkins.map((ci, idx) => {
              const isExpanded = expandedCheckin === ci.id;
              const linkedRecord = ci.linked_record_id
                ? records.find((r) => r.id === ci.linked_record_id)
                : null;

              return (
                <div
                  key={ci.id}
                  style={{
                    ...cardStyle,
                    padding: "16px 20px",
                    cursor: "pointer",
                    background: idx % 2 === 0 ? "#fff" : "var(--color-stone-50)",
                  }}
                  onClick={() => setExpandedCheckin(isExpanded ? null : ci.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)", fontWeight: 600 }}>
                          {formatDate(ci.date)}
                        </span>
                        {linkedRecord && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                            color: "#1E40AF",
                            background: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                            Linked
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: 13,
                        color: "#1C1917",
                        fontFamily: "var(--font-sans)",
                        lineHeight: 1.5,
                        margin: 0,
                        ...(!isExpanded ? {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as never,
                          overflow: "hidden",
                        } : {}),
                      }}>
                        {ci.summary}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-stone-300)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-stone-100)" }} onClick={(e) => e.stopPropagation()}>
                      {ci.manager_feedback && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ ...labelStyle, marginBottom: 4 }}>Manager Feedback</span>
                          <p style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
                            {ci.manager_feedback}
                          </p>
                        </div>
                      )}
                      {ci.your_notes && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ ...labelStyle, marginBottom: 4 }}>Your Notes</span>
                          <p style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
                            {ci.your_notes}
                          </p>
                        </div>
                      )}
                      {linkedRecord && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ ...labelStyle, marginBottom: 4 }}>Linked Record</span>
                          <p style={{ fontSize: 13, color: "#1E40AF", fontFamily: "var(--font-sans)", margin: 0 }}>
                            {formatDate(linkedRecord.date)} — {linkedRecord.title}
                          </p>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCheckin(ci.id); }}
                          style={{ ...btnOutline, padding: "5px 10px", fontSize: 11, color: "#991B1B", borderColor: "#FECACA" }}
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
      </div>

      {/* ============================================================ */}
      {/*  GOALPOST TRACKER                                             */}
      {/* ============================================================ */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#1C1917", marginBottom: 16 }}>
          Goal Revision History
        </h2>

        {revisions.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontSize: 14, color: "var(--color-stone-400)", fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
              No goal revisions recorded. If your goals or criteria change, use the &quot;Flag as Revised&quot; button to document it.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 32 }}>
            {/* Vertical timeline line */}
            <div
              style={{
                position: "absolute",
                left: 9,
                top: 0,
                bottom: 0,
                width: 2,
                background: "#FDE68A",
              }}
            />

            {revisions.map((rev, idx) => (
              <div key={`${rev.goalId}-${idx}`} style={{ position: "relative", marginBottom: 20 }}>
                {/* Amber dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -27,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#FDE68A",
                    border: "2px solid #D97706",
                  }}
                />

                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "#92400E" }}>
                      {formatDate(rev.date)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", fontFamily: "var(--font-sans)" }}>
                      {rev.goalTitle}
                    </span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Original:
                    </span>
                    <p style={{ fontSize: 13, color: "#78716C", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 2, textDecoration: "line-through" }}>
                      {rev.original}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Revised:
                    </span>
                    <p style={{ fontSize: 13, color: "#1C1917", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 2 }}>
                      {rev.revised}
                    </p>
                  </div>
                  {rev.notes && (
                    <p style={{ fontSize: 12, color: "#92400E", fontStyle: "italic", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 6 }}>
                      {rev.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
