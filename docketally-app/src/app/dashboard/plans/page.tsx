"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import RichTextarea from "@/components/RichTextarea";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess } from "@/lib/subscription";
import ProGate from "@/components/ProGate";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  case_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CaseBasic {
  id: string;
  name: string;
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
/*  Plan Types                                                         */
/* ------------------------------------------------------------------ */

const PLAN_TYPES = [
  { value: "development", label: "Development Plan", shortLabel: "Development", description: "Professional development or growth plan with milestones", defaultName: "Development Plan" },
  { value: "role_transition", label: "Role Transition", shortLabel: "Transition", description: "Role change, transfer, or new responsibilities plan", defaultName: "Role Transition Plan" },
  { value: "accommodation", label: "Reasonable Accommodation", shortLabel: "Accommodation", description: "ADA or workplace accommodation agreement and tracking", defaultName: "Reasonable Accommodation Plan" },
  { value: "return_to_work", label: "Return-to-Work", shortLabel: "RTW", description: "Plan for returning after leave, accommodation, or suspension", defaultName: "Return-to-Work Plan" },
  { value: "pip", label: "Performance Improvement Plan", shortLabel: "PIP", description: "Formal performance improvement plan with measurable goals and deadlines", defaultName: "Performance Improvement Plan" },
  { value: "corrective", label: "Corrective Action", shortLabel: "Corrective", description: "Formal corrective action for policy or conduct issues", defaultName: "Corrective Action Plan" },
  { value: "probation", label: "Probationary Period", shortLabel: "Probation", description: "New hire or extended probationary review period", defaultName: "Probationary Period" },
] as const;

function getTypeInfo(planType: string) {
  return PLAN_TYPES.find((t) => t.value === planType) ?? PLAN_TYPES[0];
}

function getTypeBadge(planType: string): { color: string; bg: string; border: string } {
  switch (planType) {
    case "pip":
    case "corrective":
      return { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" };
    case "probation":
    case "return_to_work":
      return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" };
    case "accommodation":
      return { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" };
    case "role_transition":
    case "development":
    default:
      return { color: "#292524", bg: "#F5F5F4", border: "#D6D3D1" };
  }
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
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
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  color: "#292524",
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
  color: "#292524",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid var(--color-stone-300)",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
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
      fontWeight: 700,
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
      fontWeight: 700,
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
      fontWeight: 700,
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
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: "#292524",
    background: "#F5F5F4",
    border: "1px solid #D6D3D1",
  };
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlansPage() {
  const subscription = useSubscription();
  if (!hasActiveAccess(subscription)) return <ProGate feature="Plans" />;

  const supabase = createClient();

  /* ----- state ----- */
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, PlanGoal[]>>({});
  const [checkinsMap, setCheckinsMap] = useState<Record<string, PlanCheckin[]>>({});
  const [records, setRecords] = useState<DocketRecord[]>([]);
  const [cases, setCases] = useState<CaseBasic[]>([]);

  // expanded plan
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [showCompletedPlans, setShowCompletedPlans] = useState(false);

  // forms
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    plan_type: "pip",
    plan_name: "Performance Improvement Plan",
    start_date: todayStr(),
    end_date: "",
    notes: "",
    case_id: "",
  });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [showGoalForm, setShowGoalForm] = useState<string | null>(null); // plan_id or null
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

  const [showCheckinForm, setShowCheckinForm] = useState<string | null>(null); // plan_id or null
  const [checkinForm, setCheckinForm] = useState({
    date: todayStr(),
    summary: "",
    manager_feedback: "",
    your_notes: "",
    linked_record_id: "",
  });

  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);

  // Per-plan truncation
  const [showFullDesc, setShowFullDesc] = useState<Record<string, boolean>>({});
  const [descOverflows, setDescOverflows] = useState<Record<string, boolean>>({});
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [goalOverflows, setGoalOverflows] = useState<Record<string, boolean>>({});
  const descRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const goalRefs = useRef<Record<string, HTMLParagraphElement | null>>({});

  /* ----- derived ----- */
  const activePlans = useMemo(() => plans.filter((p) => p.status !== "completed"), [plans]);
  const completedPlans = useMemo(() => plans.filter((p) => p.status === "completed"), [plans]);

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

    const [plansRes, recordsRes, casesRes] = await Promise.all([
      supabase
        .from("plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("records")
        .select("id, title, date, entry_type")
        .eq("user_id", userId)
        .order("date", { ascending: false }),
      supabase
        .from("cases")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", { ascending: true }),
    ]);

    const allPlans: Plan[] = plansRes.data ?? [];
    setPlans(allPlans);
    setRecords(recordsRes.data ?? []);
    setCases(casesRes.data ?? []);

    // Fetch goals and checkins for all plans
    if (allPlans.length > 0) {
      const planIds = allPlans.map((p) => p.id);
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase
          .from("plan_goals")
          .select("*")
          .in("plan_id", planIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("plan_checkins")
          .select("*")
          .in("plan_id", planIds)
          .order("date", { ascending: false }),
      ]);

      // Group goals by plan_id
      const gMap: Record<string, PlanGoal[]> = {};
      for (const g of goalsRes.data ?? []) {
        if (!gMap[g.plan_id]) gMap[g.plan_id] = [];
        gMap[g.plan_id].push(g);
      }
      setGoalsMap(gMap);

      // Group checkins by plan_id
      const cMap: Record<string, PlanCheckin[]> = {};
      for (const c of checkinsRes.data ?? []) {
        if (!cMap[c.plan_id]) cMap[c.plan_id] = [];
        cMap[c.plan_id].push(c);
      }
      setCheckinsMap(cMap);
    } else {
      setGoalsMap({});
      setCheckinsMap({});
    }

    // Auto-expand the first active plan if none expanded
    if (allPlans.length > 0) {
      const active = allPlans.filter((p) => p.status !== "completed");
      if (active.length === 1) {
        setExpandedPlanId((prev) => prev ?? active[0].id);
      }
    }

    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  /* ----- overflow detection ----- */
  useEffect(() => {
    const overflows: Record<string, boolean> = {};
    for (const [id, el] of Object.entries(descRefs.current)) {
      if (el) overflows[id] = el.scrollHeight > el.clientHeight;
    }
    setDescOverflows(overflows);
  }, [plans, loading]);

  useEffect(() => {
    const overflows: Record<string, boolean> = {};
    for (const [id, el] of Object.entries(goalRefs.current)) {
      if (el) overflows[id] = el.scrollHeight > el.clientHeight;
    }
    setGoalOverflows(overflows);
  }, [goalsMap]);

  /* ----- plan helpers ----- */
  function getPlanProgress(plan: Plan) {
    const start = new Date(plan.start_date + "T00:00:00").getTime();
    const end = new Date(plan.end_date + "T00:00:00").getTime();
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed = Math.round((now - start) / 86400000);
    const daysRemaining = Math.max(0, totalDays - elapsed);
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    return { daysRemaining, totalDays, pct };
  }

  function getPlanStatus(plan: Plan, goals: PlanGoal[], checkins: PlanCheckin[]) {
    if (plan.status === "completed") return "completed";
    const end = new Date(plan.end_date + "T00:00:00").getTime();
    if (Date.now() > end) return "expired";
    // All goals met → completed
    if (goals.length > 0 && goals.every((g) => g.status === "met")) return "completed";
    // Has checkins or goals → in progress
    if (checkins.length > 0 || goals.length > 0) return "in_progress";
    return "not_started";
  }

  function getRevisions(planGoals: PlanGoal[]) {
    return planGoals
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
  }

  /* ----- handlers ----- */
  async function savePlan() {
    if (!userId || !planForm.start_date || !planForm.end_date) return;
    setSaving(true);

    if (editingPlanId) {
      await supabase
        .from("plans")
        .update({
          plan_name: planForm.plan_name,
          plan_type: planForm.plan_type,
          start_date: planForm.start_date,
          end_date: planForm.end_date,
          notes: planForm.notes || null,
          case_id: planForm.case_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPlanId);
    } else {
      await supabase.from("plans").insert({
        user_id: userId,
        plan_name: planForm.plan_name,
        plan_type: planForm.plan_type,
        start_date: planForm.start_date,
        end_date: planForm.end_date,
        notes: planForm.notes || null,
        case_id: planForm.case_id || null,
      });
    }

    setShowPlanForm(false);
    setEditingPlanId(null);
    setSaving(false);
    await fetchAll();
  }

  async function markPlanComplete(planId: string) {
    setSaving(true);
    await supabase
      .from("plans")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", planId);
    setSaving(false);
    await fetchAll();
  }

  async function deletePlan(planId: string) {
    setSaving(true);
    await supabase.from("plan_checkins").delete().eq("plan_id", planId);
    await supabase.from("plan_goals").delete().eq("plan_id", planId);
    await supabase.from("plans").delete().eq("id", planId);
    setConfirmDeletePlanId(null);
    setEditingPlanId(null);
    setExpandedPlanId(null);
    setSaving(false);
    await fetchAll();
  }

  async function saveGoal(planId: string) {
    if (!userId || !goalForm.title) return;
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
        plan_id: planId,
        user_id: userId,
        title: goalForm.title,
        description: goalForm.description || null,
        success_criteria: goalForm.success_criteria || null,
        deadline: goalForm.deadline || null,
      });
    }

    setShowGoalForm(null);
    setEditingGoalId(null);
    setGoalForm({ title: "", description: "", success_criteria: "", deadline: "", status: "in_progress" });
    setSaving(false);
    await fetchAll();
  }

  async function reviseGoal(goalId: string, planId: string) {
    if (!reviseForm.new_description) return;
    setSaving(true);

    const planGoals = goalsMap[planId] ?? [];
    const goal = planGoals.find((g) => g.id === goalId);
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

  async function saveCheckin(planId: string) {
    if (!userId || !checkinForm.summary) return;
    setSaving(true);

    await supabase.from("plan_checkins").insert({
      plan_id: planId,
      user_id: userId,
      date: checkinForm.date,
      summary: checkinForm.summary,
      manager_feedback: checkinForm.manager_feedback || null,
      your_notes: checkinForm.your_notes || null,
      linked_record_id: checkinForm.linked_record_id || null,
    });

    setShowCheckinForm(null);
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

  function openEditGoal(goal: PlanGoal, planId: string) {
    setEditingGoalId(goal.id);
    setGoalForm({
      title: goal.title,
      description: goal.description || "",
      success_criteria: goal.success_criteria || "",
      deadline: goal.deadline || "",
      status: goal.status,
    });
    setShowGoalForm(planId);
  }

  function openReviseGoal(goal: PlanGoal) {
    setReviseForm({
      new_description: goal.description || "",
      revision_notes: "",
      revised_date: todayStr(),
    });
    setShowReviseForm(goal.id);
  }

  function openEditPlan(plan: Plan) {
    setPlanForm({
      plan_type: plan.plan_type || "pip",
      plan_name: plan.plan_name,
      start_date: plan.start_date,
      end_date: plan.end_date,
      notes: plan.notes || "",
      case_id: plan.case_id || "",
    });
    setEditingPlanId(plan.id);
    setExpandedPlanId(plan.id);
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
        <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
          Loading plans...
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Plan Creation / Edit Form                                        */
  /* ---------------------------------------------------------------- */

  if (showPlanForm) {
    return (
      <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => { setShowPlanForm(false); setEditingPlanId(null); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            color: "var(--color-stone-600)",
            marginBottom: 20,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#292524", marginBottom: 8 }}>
          {editingPlanId ? "Edit Plan" : "Add a Plan"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6, fontFamily: "var(--font-sans)", marginBottom: 28 }}>
          {editingPlanId ? "Update the details of your workplace plan." : "Select the type of plan and enter its details."}
        </p>

        {/* Plan Type Selector (only on create, not edit) */}
        {!editingPlanId && (
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Plan Type</label>
            <div className="da-plan-type-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {PLAN_TYPES.map((type) => {
                const isSelected = planForm.plan_type === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      setPlanForm({ ...planForm, plan_type: type.value, plan_name: type.defaultName });
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: isSelected ? "2px solid var(--color-green)" : "1px solid var(--color-stone-300)",
                      background: isSelected ? "#F0FDF4" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "#292524",
                          background: "#F5F5F4",
                          border: "1px solid #D6D3D1",
                        }}
                      >
                        {type.shortLabel}
                      </span>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)" }}>
                      {type.label}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.4 }}>
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            <div className="da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
              <RichTextarea
                value={planForm.notes}
                onChange={(v) => setPlanForm({ ...planForm, notes: v })}
                placeholder="Any additional context about the plan"
                style={textareaStyle}
              />
            </div>

            {/* Linked Case */}
            {cases.length > 0 && (
              <div>
                <label style={labelStyle}>Linked Case</label>
                <select
                  value={planForm.case_id}
                  onChange={(e) => setPlanForm({ ...planForm, case_id: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={focusInput}
                  onBlur={blurInput}
                >
                  <option value="">None</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowPlanForm(false); setEditingPlanId(null); }}
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
                {saving ? "Saving..." : editingPlanId ? "Update Plan" : "Save Plan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Empty State — No Plans                                           */
  /* ---------------------------------------------------------------- */

  if (plans.length === 0) {
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
            border: "1px solid var(--color-stone-300)",
            padding: "56px 40px",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#F0FDF4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "#292524", marginBottom: 10 }}>
            Stay ahead of workplace changes
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6, fontFamily: "var(--font-sans)", marginBottom: 24 }}>
            Track action items, goals, and commitments from meetings with your manager. Whether it is a development plan, new responsibilities, or performance targets, keeping a record helps you stay aligned and show your progress.
          </p>
          <button
            onClick={() => {
              setPlanForm({ plan_type: "development", plan_name: "Development Plan", start_date: todayStr(), end_date: "", notes: "", case_id: "" });
              setEditingPlanId(null);
              setShowPlanForm(true);
            }}
            style={btnGreen}
          >
            + New Plan
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render a single plan card                                        */
  /* ---------------------------------------------------------------- */

  function renderPlanCard(plan: Plan) {
    const planGoals = goalsMap[plan.id] ?? [];
    const planCheckins = checkinsMap[plan.id] ?? [];
    const progress = getPlanProgress(plan);
    const pStatus = getPlanStatus(plan, planGoals, planCheckins);
    const revisions = getRevisions(planGoals);
    const typeInfo = getTypeInfo(plan.plan_type);
    const typeBadge = getTypeBadge(plan.plan_type);
    const isExpanded = expandedPlanId === plan.id;
    const isEditing = editingPlanId === plan.id;

    const start = new Date(plan.start_date + "T00:00:00");
    const end = new Date(plan.end_date + "T00:00:00");
    const durationDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const goalCount = planGoals.length;
    const revisionCount = revisions.length;
    const checkinCount = planCheckins.length;

    return (
      <div key={plan.id} style={{ marginBottom: 16 }}>
        {/* Summary Pill */}
        <div
          style={{
            background: "var(--color-stone-50)",
            border: "1px solid var(--color-stone-300)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#292524",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {durationDays}-day {typeInfo.shortLabel} ({startStr} to {endStr}) · {goalCount} goal{goalCount !== 1 ? "s" : ""} · {revisionCount} revision{revisionCount !== 1 ? "s" : ""} · {checkinCount} check-in{checkinCount !== 1 ? "s" : ""}
            {pStatus !== "completed" && <> · Status: {pStatus.charAt(0).toUpperCase() + pStatus.slice(1)}</>}
          </p>
        </div>

        {/* Plan Header Card */}
        <div style={{ ...cardStyle, marginBottom: 0 }}>
          {/* Clickable header to expand/collapse */}
          <div
            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
            style={{ cursor: "pointer" }}
          >
            {/* 1. Header row: type badge + title + status | expand chevron + buttons */}
            <div className="da-plan-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                {/* Type badge */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: typeBadge.color,
                    background: typeBadge.bg,
                    border: `1px solid ${typeBadge.border}`,
                  }}
                >
                  {typeInfo.shortLabel}
                </span>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#292524", margin: 0 }}>
                  {plan.plan_name}
                </h2>
                <span style={getStatusBadge(pStatus)}>{statusLabel(pStatus)}</span>
                {(() => {
                  if (!plan.case_id) return null;
                  const linkedCase = cases.find((c) => c.id === plan.case_id);
                  if (!linkedCase) return null;
                  return (
                    <span style={{
                      display: "inline-flex",
                      padding: "3px 10px",
                      borderRadius: 5,
                      background: "#F5F5F4",
                      border: "1px solid #E7E5E4",
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: "#57534E",
                      fontFamily: "var(--font-mono)",
                    }}>
                      {linkedCase.name.length > 24 ? linkedCase.name.slice(0, 24) + "..." : linkedCase.name}
                    </span>
                  );
                })()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <button onClick={() => setEditingPlanId(null)} style={{ ...btnOutline, color: "var(--color-stone-500)" }}>
                    Cancel Edit
                  </button>
                ) : (
                  <button
                    onClick={() => openEditPlan(plan)}
                    title="Edit Plan"
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: "1px solid var(--color-stone-300)",
                      background: "transparent",
                      color: "var(--color-stone-500)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-stone-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                )}
                {(pStatus === "in_progress" || pStatus === "not_started") && (
                  <button
                    onClick={() => markPlanComplete(plan.id)}
                    disabled={saving}
                    style={{ ...btnOutline, color: "#15803D", borderColor: "#BBF7D0" }}
                  >
                    {saving ? "..." : "Mark Complete"}
                  </button>
                )}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-stone-500)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", marginLeft: 4 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* CARD BODY — unified layout */}

          {/* Edit-mode accent */}
          {isEditing && <div style={{ borderTop: "2px solid var(--color-green)", marginTop: 12 }} />}

          {/* Plan Name — only visible when editing (header h2 shows it in read mode) */}
          {isEditing && (
            <div style={{ marginTop: 16 }}>
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
          )}

          {/* Dates — meta text (read) or date inputs (edit) */}
          <div style={{ marginTop: isEditing ? 20 : 0 }}>
            {isEditing ? (
              <div className="da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
            ) : (
              <div
                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                style={{ cursor: "pointer" }}
              >
                <p style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-mono)", margin: "0 0 16px 0" }}>
                  {formatDate(plan.start_date)} &rarr; {formatDate(plan.end_date)} &middot; {progress.totalDays} days
                  {(pStatus === "in_progress" || pStatus === "not_started") && <> &middot; {progress.daysRemaining} day{progress.daysRemaining !== 1 ? "s" : ""} remaining</>}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar — always visible */}
          <div style={{ marginBottom: (plan.notes || isEditing) ? 16 : 0, marginTop: isEditing ? 20 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-600)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Progress
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-stone-600)" }}>
                {pStatus === "completed" ? "100" : progress.pct}%
              </span>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--color-stone-100)" }}>
              <div
                style={{
                  width: `${pStatus === "completed" ? 100 : progress.pct}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: pStatus === "expired" ? "#EF4444" : "var(--color-green)",
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>

          {/* Notes — truncated markdown (read) or RichTextarea (edit) */}
          {isEditing ? (
            <div style={{ marginTop: 4 }}>
              <label style={labelStyle}>Notes</label>
              <RichTextarea
                value={planForm.notes}
                onChange={(v) => setPlanForm({ ...planForm, notes: v })}
                placeholder="Any additional context about the plan"
                style={textareaStyle}
              />
              {/* Linked Case (inline edit) */}
              {cases.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Linked Case</label>
                  <select
                    value={planForm.case_id}
                    onChange={(e) => setPlanForm({ ...planForm, case_id: e.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  >
                    <option value="">None</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            plan.notes && (
              <div style={{ borderTop: "1px solid #D6D3D1", paddingTop: 16 }}>
                <p
                  ref={(el) => { descRefs.current[plan.id] = el; }}
                  className="da-plan-desc"
                  style={{
                    fontSize: 14,
                    color: "#292524",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.6,
                    margin: 0,
                    ...(!(showFullDesc[plan.id]) ? {
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical" as never,
                      overflow: "hidden",
                    } : {}),
                  }}
                >
                  {renderMarkdown(plan.notes!)}
                </p>
                {descOverflows[plan.id] && (
                  <button
                    onClick={() => setShowFullDesc((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "4px 0 0",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      color: "#22C55E",
                    }}
                  >
                    {showFullDesc[plan.id] ? "Show less \u2191" : "Show more \u2193"}
                  </button>
                )}
              </div>
            )
          )}

          {/* Action buttons — only when editing */}
          {isEditing && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
              <button
                onClick={() => setConfirmDeletePlanId(plan.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Delete Plan
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setEditingPlanId(null)}
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
                  {saving ? "Saving..." : "Update Plan"}
                </button>
              </div>
            </div>
          )}

          {/* Expand/collapse trigger — always visible */}
          <div
            onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
            style={{
              cursor: "pointer",
              borderTop: "1px solid var(--color-stone-100)",
              paddingTop: 12,
              marginTop: isEditing ? 20 : (plan.notes ? 0 : 16),
              textAlign: "center",
            }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              color: "var(--color-stone-500)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}>
              {isExpanded ? "Hide details" : "Show details"}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        {/* ====== EXPANDED CONTENT ====== */}
        {isExpanded && (
          <div style={{ marginTop: 16 }}>
            {/* GOALS SECTION */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#292524", margin: 0 }}>
                  Goals
                </h2>
                <button
                  onClick={() => {
                    setEditingGoalId(null);
                    setGoalForm({ title: "", description: "", success_criteria: "", deadline: "", status: "in_progress" });
                    setShowGoalForm(plan.id);
                  }}
                  style={{ ...btnGreen, padding: "8px 16px", fontSize: 13 }}
                >
                  Add Goal
                </button>
              </div>

              {/* Goal Form */}
              {showGoalForm === plan.id && (
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
                      <RichTextarea
                        value={goalForm.description}
                        onChange={(v) => setGoalForm({ ...goalForm, description: v })}
                        placeholder="What is expected?"
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Success Criteria</label>
                      <RichTextarea
                        value={goalForm.success_criteria}
                        onChange={(v) => setGoalForm({ ...goalForm, success_criteria: v })}
                        placeholder="How will success be measured?"
                        style={textareaStyle}
                      />
                    </div>
                    <div className="da-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                        onClick={() => { setShowGoalForm(null); setEditingGoalId(null); }}
                        style={btnOutline}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveGoal(plan.id)}
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
              {planGoals.length === 0 && showGoalForm !== plan.id ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                    No goals added yet. Add goals to track progress and flag revisions.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {planGoals.map((goal) => {
                    const isGoalExpanded = expandedGoals[goal.id] ?? false;
                    const goalOverflow = goalOverflows[goal.id] ?? false;

                    return (
                      <div
                        key={goal.id}
                        style={{
                          background: "#fff",
                          borderRadius: 10,
                          border: "1px solid #D6D3D1",
                          borderLeft: goal.status === "revised" ? "3px solid #FDE68A" : goal.status === "met" ? "3px solid #BBF7D0" : goal.status === "not_met" ? "3px solid #FECACA" : "3px solid var(--color-stone-300)",
                          padding: "16px 20px",
                        }}
                      >
                        {/* Row 1: title + badge | action buttons */}
                        <div className="da-goal-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", margin: 0 }}>
                              {goal.title}
                            </h3>
                            <span style={getStatusBadge(goal.status)}>{statusLabel(goal.status)}</span>
                          </div>
                          <div className="da-goal-actions" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => openReviseGoal(goal)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #FDE68A",
                                background: "transparent",
                                color: "#B45309",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                                transition: "background 0.15s",
                                lineHeight: 1.2,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#FFFBEB"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              Flag as Revised
                            </button>
                            <button
                              onClick={() => openEditGoal(goal, plan.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #D6D3D1",
                                background: "transparent",
                                color: "#292524",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                                transition: "background 0.15s",
                                lineHeight: 1.2,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F4"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteGoal(goal.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #FECACA",
                                background: "transparent",
                                color: "#DC2626",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "var(--font-sans)",
                                cursor: "pointer",
                                transition: "background 0.15s",
                                lineHeight: 1.2,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Deadline */}
                        {goal.deadline && (
                          <p style={{ fontSize: 12, color: "#292524", fontFamily: "var(--font-mono)", margin: "0 0 8px 0" }}>
                            Deadline: {formatDate(goal.deadline)}
                          </p>
                        )}

                        {/* Revision display */}
                        {goal.original_description && (
                          <div style={{ border: "1px solid #E7E5E4", borderRadius: 8, overflow: "hidden", marginBottom: 8, marginTop: 8 }}>
                            <div style={{ padding: "10px 14px", background: "#F5F5F4", borderBottom: "1px solid #E7E5E4", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.04em" }}>Revision</span>
                              {goal.revised_date && (
                                <span style={{ fontSize: 11, color: "var(--color-stone-500)", fontFamily: "var(--font-mono)" }}>
                                  {formatDate(goal.revised_date)}
                                </span>
                              )}
                            </div>
                            {goal.revision_notes && (
                              <div style={{ padding: "10px 14px", background: "#FFFBEB", borderBottom: "1px solid #E7E5E4", fontSize: 12, color: "#92400E", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                                {renderMarkdown(goal.revision_notes)}
                              </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                              <div style={{ padding: "10px 14px", background: "#FEF2F2", borderRight: "1px solid #E7E5E4" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 }}>Before</span>
                                <div style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                                  {renderMarkdown(goal.original_description!)}
                                </div>
                              </div>
                              <div style={{ padding: "10px 14px", background: "#F0FDF4" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#15803D", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 }}>After</span>
                                <div style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                                  {renderMarkdown(goal.description || "")}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Revise form inline */}
                        {showReviseForm === goal.id && (
                          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "16px", marginBottom: 8, marginTop: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
                              Flag Goal as Revised
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div>
                                <label style={labelStyle}>New Description</label>
                                <RichTextarea
                                  value={reviseForm.new_description}
                                  onChange={(v) => setReviseForm({ ...reviseForm, new_description: v })}
                                  placeholder="What is the new expectation?"
                                  style={textareaStyle}
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>What Changed?</label>
                                <RichTextarea
                                  value={reviseForm.revision_notes}
                                  onChange={(v) => setReviseForm({ ...reviseForm, revision_notes: v })}
                                  placeholder="Describe what shifted and why this matters"
                                  style={textareaStyle}
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
                                  onClick={() => reviseGoal(goal.id, plan.id)}
                                  disabled={saving || !reviseForm.new_description}
                                  style={{ ...btnGreen, padding: "8px 16px", fontSize: 13, background: "#D97706", opacity: saving || !reviseForm.new_description ? 0.5 : 1 }}
                                >
                                  {saving ? "Saving..." : "Save Revision"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Row 3: Description (truncated to 2 lines) */}
                        {!goal.original_description && goal.description && (
                          <div style={{ marginTop: goal.deadline ? 0 : 8 }}>
                            <p
                              ref={(el) => { goalRefs.current[goal.id] = el; }}
                              style={{
                                fontSize: 14,
                                color: "#292524",
                                fontFamily: "var(--font-sans)",
                                lineHeight: 1.6,
                                margin: 0,
                                ...(!isGoalExpanded ? {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical" as never,
                                  overflow: "hidden",
                                } : {}),
                              }}
                            >
                              {renderMarkdown(goal.description!)}
                            </p>
                            {goalOverflow && (
                              <button
                                onClick={() => setExpandedGoals((prev) => ({ ...prev, [goal.id]: !prev[goal.id] }))}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "4px 0 0",
                                  cursor: "pointer",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  fontFamily: "var(--font-sans)",
                                  color: "#22C55E",
                                }}
                              >
                                {isGoalExpanded ? "Show less \u2191" : "Show more \u2193"}
                              </button>
                            )}
                          </div>
                        )}
                        {goal.success_criteria && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Success Criteria:
                            </span>
                            <div style={{ fontSize: 13, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.5, marginTop: 4 }}>
                              {renderMarkdown(goal.success_criteria!)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CHECK-INS SECTION */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#292524", margin: 0 }}>
                  Check-Ins
                </h2>
                <button
                  onClick={() => {
                    setCheckinForm({ date: todayStr(), summary: "", manager_feedback: "", your_notes: "", linked_record_id: "" });
                    setShowCheckinForm(plan.id);
                  }}
                  style={{ ...btnGreen, padding: "8px 16px", fontSize: 13 }}
                >
                  Log Check-In
                </button>
              </div>

              {/* Checkin Form */}
              {showCheckinForm === plan.id && (
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
                      <RichTextarea
                        value={checkinForm.summary}
                        onChange={(v) => setCheckinForm({ ...checkinForm, summary: v })}
                        placeholder="Summarize what happened during the check-in"
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Manager Feedback</label>
                      <RichTextarea
                        value={checkinForm.manager_feedback}
                        onChange={(v) => setCheckinForm({ ...checkinForm, manager_feedback: v })}
                        placeholder="What feedback did your manager give?"
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Your Notes</label>
                      <RichTextarea
                        value={checkinForm.your_notes}
                        onChange={(v) => setCheckinForm({ ...checkinForm, your_notes: v })}
                        placeholder="Anything you want to note privately?"
                        style={textareaStyle}
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
                            {formatDate(r.date)}: {r.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowCheckinForm(null)} style={btnOutline}>
                        Cancel
                      </button>
                      <button
                        onClick={() => saveCheckin(plan.id)}
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
              {planCheckins.length === 0 && showCheckinForm !== plan.id ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)" }}>
                    No check-ins logged yet. Document your meetings and progress updates here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {planCheckins.map((ci, idx) => {
                    const isCiExpanded = expandedCheckin === ci.id;
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
                        onClick={() => setExpandedCheckin(isCiExpanded ? null : ci.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-600)", fontWeight: 700 }}>
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
                                  fontWeight: 700,
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
                              color: "#292524",
                              fontFamily: "var(--font-sans)",
                              lineHeight: 1.5,
                              margin: 0,
                              ...(!isCiExpanded ? {
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical" as never,
                                overflow: "hidden",
                              } : {}),
                            }}>
                              {renderMarkdown(ci.summary)}
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
                              style={{ transform: isCiExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>

                        {/* Expanded */}
                        {isCiExpanded && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-stone-100)" }} onClick={(e) => e.stopPropagation()}>
                            {ci.manager_feedback && (
                              <div style={{ marginBottom: 12 }}>
                                <span style={{ ...labelStyle, marginBottom: 4 }}>Manager Feedback</span>
                                <div style={{ fontSize: 13, color: "var(--color-stone-700)", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
                                  {renderMarkdown(ci.manager_feedback)}
                                </div>
                              </div>
                            )}
                            {ci.your_notes && (
                              <div style={{ marginBottom: 12 }}>
                                <span style={{ ...labelStyle, marginBottom: 4 }}>Your Notes</span>
                                <div style={{ fontSize: 13, color: "var(--color-stone-700)", fontFamily: "var(--font-sans)", lineHeight: 1.6, margin: 0 }}>
                                  {renderMarkdown(ci.your_notes)}
                                </div>
                              </div>
                            )}
                            {linkedRecord && (
                              <div style={{ marginBottom: 12 }}>
                                <span style={{ ...labelStyle, marginBottom: 4 }}>Linked Record</span>
                                <p style={{ fontSize: 13, color: "#1E40AF", fontFamily: "var(--font-sans)", margin: 0 }}>
                                  {formatDate(linkedRecord.date)}: {linkedRecord.title}
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

            {/* GOALPOST TRACKER */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "#292524", marginBottom: 16 }}>
                Goal Revision History
              </h2>

              {revisions.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-stone-500)", fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
                    No goal revisions recorded. If your goals or criteria change, use the &quot;Flag as Revised&quot; button to document it.
                  </p>
                </div>
              ) : (
                <div className="da-revision-timeline" style={{ position: "relative", paddingLeft: 32 }}>
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

                      <div style={{ border: "1px solid #E7E5E4", borderRadius: 10, overflow: "hidden" }}>
                        {/* Header: Revision date + goal name */}
                        <div style={{ padding: "12px 18px", background: "#F5F5F4", borderBottom: "1px solid #E7E5E4", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Revision
                          </span>
                          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-stone-500)" }}>
                            {formatDate(rev.date)}
                          </span>
                          <span style={{ color: "var(--color-stone-300)" }}>&middot;</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)" }}>
                            {rev.goalTitle}
                          </span>
                        </div>

                        {/* Revision note (why it changed) */}
                        {rev.notes && (
                          <div style={{ padding: "10px 18px", background: "#FFFBEB", borderBottom: "1px solid #E7E5E4", fontSize: 13, color: "#92400E", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                            {renderMarkdown(rev.notes)}
                          </div>
                        )}

                        {/* Before / After columns */}
                        <div className="da-revision-diff" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                          <div style={{ padding: "12px 18px", background: "#FEF2F2", borderRight: "1px solid #E7E5E4" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Before</span>
                            <div style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                              {renderMarkdown(rev.original)}
                            </div>
                          </div>
                          <div style={{ padding: "12px 18px", background: "#F0FDF4" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#15803D", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>After</span>
                            <div style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
                              {renderMarkdown(rev.revised)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Plans Dashboard                                                  */
  /* ---------------------------------------------------------------- */

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "#292524", marginBottom: 8 }}>
            Plans
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-stone-600)", lineHeight: 1.6, fontFamily: "var(--font-sans)", maxWidth: 600 }}>
            If you&apos;re on a PIP or formal plan, track its goals, deadlines, and check-ins. Goal changes are flagged automatically.
          </p>
        </div>
        <button
          onClick={() => {
            setPlanForm({ plan_type: "pip", plan_name: "Performance Improvement Plan", start_date: todayStr(), end_date: "", notes: "", case_id: "" });
            setEditingPlanId(null);
            setShowPlanForm(true);
          }}
          style={btnGreen}
        >
          Add a Plan
        </button>
      </div>

      {/* ACTIVE PLANS */}
      {activePlans.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "#292524",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}>
            Active Plans ({activePlans.length})
          </p>
          {activePlans.map((plan) => renderPlanCard(plan))}
        </div>
      )}

      {/* COMPLETED PLANS */}
      {completedPlans.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompletedPlans(!showCompletedPlans)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--color-stone-600)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
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
              style={{ transform: showCompletedPlans ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Completed Plans ({completedPlans.length})
          </button>
          {showCompletedPlans && completedPlans.map((plan) => renderPlanCard(plan))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeletePlanId && (
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
            zIndex: 9999,
          }}
          onClick={() => setConfirmDeletePlanId(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px",
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "#292524", marginBottom: 12 }}>
              Delete this plan?
            </h3>
            <p style={{ fontSize: 14, color: "var(--color-stone-600)", fontFamily: "var(--font-sans)", lineHeight: 1.6, marginBottom: 24 }}>
              This will also delete all goals, check-ins, and revision history. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDeletePlanId(null)}
                style={btnOutline}
              >
                Cancel
              </button>
              <button
                onClick={() => deletePlan(confirmDeletePlanId)}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#DC2626",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "Deleting..." : "Delete Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
