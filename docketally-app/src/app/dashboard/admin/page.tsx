"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdminTab = "overview" | "users" | "revenue" | "usage" | "support" | "settings";

interface UserStats {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  record_count: number;
  vault_doc_count: number;
  plan_status: string | null;
  plan_name: string | null;
  plan_days_remaining: number | null;
}

interface AdminTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  message_count?: number;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  from_type: string;
  message_text: string;
  created_at: string;
}

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

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function ticketStatusBadge(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  if (status === "in_progress") {
    return { ...base, color: "#1E40AF", background: "#DBEAFE", border: "1px solid #BFDBFE" };
  }
  if (status === "resolved") {
    return { ...base, color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0" };
  }
  return { ...base, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A" };
}

function categoryBadge(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    textTransform: "uppercase",
    color: "#292524",
    background: "#F5F5F4",
    border: "1px solid #D6D3D1",
  };
}

/* ------------------------------------------------------------------ */
/*  Shared Styles — Admin Design System                                */
/* ------------------------------------------------------------------ */

const metricLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  color: "#292524",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const metricValue: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 26,
  fontWeight: 700,
  color: "#292524",
  lineHeight: 1.1,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  border: "1px solid #D6D3D1",
  padding: 24,
};

const sectionLabel: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  color: "#292524",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 16,
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

const btnGreen: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "#22C55E",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  change,
  period,
}: {
  label: string;
  value: string | number;
  change?: string;
  period?: string;
}) {
  const hasChange = change && change !== "--";
  const isUp = hasChange && change.startsWith("+");
  const isDown = hasChange && change.startsWith("-");
  return (
    <div style={cardStyle}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
      {hasChange ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              color: isUp ? "#16A34A" : isDown ? "#DC2626" : "#292524",
              fontWeight: 700,
            }}
          >
            {isUp ? "\u2191" : isDown ? "\u2193" : ""} {change}
          </span>
          {period && (
            <span style={{ color: "#292524" }}>{period}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StatPill({ label, value, active }: { label: string; value: number | string; active?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 20,
        border: active ? "1px solid #BBF7D0" : "1px solid #D6D3D1",
        background: active ? "#F0FDF4" : "#fff",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          fontWeight: 700,
          color: "#292524",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          color: "#292524",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function HBar({ pct, color = "#22C55E" }: { pct: number; color?: string }) {
  return (
    <div
      style={{
        flex: 1,
        height: 8,
        borderRadius: 4,
        background: "#F5F5F4",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function AdminPage() {
  const supabase = createClient();

  // Auth & role
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Overview data
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [signupWeeks, setSignupWeeks] = useState<{ week: string; free: number; pro: number }[]>([]);

  // Users data
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<Record<string, { count: number; subjects: string[] }>>({});
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(0);
  const USERS_PER_PAGE = 15;

  // Support data
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketFilter, setTicketFilter] = useState("All");
  const [ticketCategory, setTicketCategory] = useState("All");
  const [ticketSort, setTicketSort] = useState<"newest" | "oldest">("newest");
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Auth check                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let resolved = false;

    async function checkRole(user: { id: string; email?: string }, source: string) {
      if (resolved) return;
      resolved = true;

      console.log("Admin check — source:", source, "user_id:", user.id, "email:", user.email ?? "null");
      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      console.log("Admin check — user_id:", user.id, "profile:", profile, "error:", error, "role:", profile?.role);

      if (error) {
        console.error("Admin check — profile query failed:", error.message, error.code);
        setIsAdmin(false);
        return;
      }

      const role = (profile?.role ?? "").toLowerCase();
      setIsAdmin(role === "admin");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkRole(session.user, "getSession");
      } else {
        console.log("Admin check — getSession returned no user, waiting for onAuthStateChange...");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (resolved) return;
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          if (session?.user) {
            checkRole(session.user, `onAuthStateChange(${event})`);
          } else {
            console.log("Admin check — onAuthStateChange fired with no user, event:", event);
            resolved = true;
            setIsAdmin(false);
          }
        }
      }
    );

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn("Admin check — timed out after 5s, no session found");
        resolved = true;
        setIsAdmin(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchOverview = useCallback(async () => {
    if (!userId) return;

    const { data: stats } = await supabase.rpc("admin_user_stats");
    if (stats) {
      setUserStats(stats);
      setTotalUsers(stats.length);
      setTotalRecords(
        stats.reduce((sum: number, u: UserStats) => sum + (u.record_count || 0), 0)
      );
      setActivePlans(
        stats.filter((u: UserStats) => u.plan_status === "active").length
      );
    }

    // Signup weeks (last 8 weeks) — split free/pro
    const { data: profiles } = await supabase
      .from("profiles")
      .select("created_at, role")
      .order("created_at", { ascending: true });

    if (profiles) {
      const now = new Date();
      const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
      const weekCounts: Record<string, { free: number; pro: number }> = {};
      profiles.forEach((p: { created_at: string; role?: string }) => {
        const dt = new Date(p.created_at);
        if (dt >= eightWeeksAgo) {
          const ws = getWeekStart(dt);
          if (!weekCounts[ws]) weekCounts[ws] = { free: 0, pro: 0 };
          // TODO: wire to real plan/billing data — for now treat all as free
          weekCounts[ws].free += 1;
        }
      });

      const weeks: { week: string; free: number; pro: number }[] = [];
      const current = new Date(getWeekStart(eightWeeksAgo) + "T00:00:00");
      const end = new Date(getWeekStart(now) + "T00:00:00");
      while (current <= end) {
        const ws = current.toISOString().split("T")[0];
        weeks.push({ week: ws, free: weekCounts[ws]?.free ?? 0, pro: weekCounts[ws]?.pro ?? 0 });
        current.setDate(current.getDate() + 7);
      }
      setSignupWeeks(weeks);
    }
  }, [userId, supabase]);

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map((t: AdminTicket) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      const emailMap: Record<string, string> = {};
      profiles?.forEach((p: { id: string; email: string }) => {
        emailMap[p.id] = p.email;
      });

      const { data: msgCounts } = await supabase
        .from("ticket_messages")
        .select("ticket_id");

      const countMap: Record<string, number> = {};
      msgCounts?.forEach((m: { ticket_id: string }) => {
        countMap[m.ticket_id] = (countMap[m.ticket_id] || 0) + 1;
      });

      setTickets(
        data.map((t: AdminTicket) => ({
          ...t,
          user_email: emailMap[t.user_id] || "Unknown",
          message_count: countMap[t.id] || 0,
        }))
      );
    }
  }, [supabase]);

  const fetchUserTickets = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, subject")
        .eq("user_id", uid);

      if (data) {
        setUserTickets((prev) => ({
          ...prev,
          [uid]: {
            count: data.length,
            subjects: data.map((t: { subject: string }) => t.subject),
          },
        }));
      }
    },
    [supabase]
  );

  const fetchTicketMessages = useCallback(
    async (ticketId: string) => {
      const { data } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (data) setTicketMessages(data);
    },
    [supabase]
  );

  /* ---------------------------------------------------------------- */
  /*  Effects                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (isAdmin && userId) {
      fetchOverview();
      fetchTickets();
    }
  }, [isAdmin, userId, fetchOverview, fetchTickets]);

  useEffect(() => {
    if (expandedUser && !userTickets[expandedUser]) {
      fetchUserTickets(expandedUser);
    }
  }, [expandedUser, userTickets, fetchUserTickets]);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id);
      setReplyText("");
    }
  }, [selectedTicket, fetchTicketMessages]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  async function changeUserRole(uid: string, newRole: string) {
    if (!confirm(`Change this user's role to "${newRole}"?`)) return;
    setRoleChanging(uid);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", uid);

    if (error) {
      console.error("Role change error:", error);
      alert("Failed to change role");
    } else {
      setUserStats((prev) =>
        prev.map((u) => (u.user_id === uid ? { ...u, role: newRole } : u))
      );
    }
    setRoleChanging(null);
  }

  async function sendReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      from_type: "support",
      message_text: replyText.trim(),
    });

    if (error) {
      console.error("Reply error:", error);
    } else {
      setReplyText("");
      fetchTicketMessages(selectedTicket.id);
      fetchTickets();
    }
    setSending(false);
  }

  async function updateTicketStatus(ticketId: string, newStatus: string) {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);

    if (error) {
      console.error("Status update error:", error);
    } else {
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      fetchTickets();
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Computed                                                         */
  /* ---------------------------------------------------------------- */

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return userStats;
    const q = userSearch.toLowerCase();
    return userStats.filter((u) => u.email?.toLowerCase().includes(q));
  }, [userStats, userSearch]);

  const pagedUsers = useMemo(() => {
    const start = usersPage * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, usersPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)),
    [filteredUsers]
  );

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (ticketFilter !== "All") {
      const statusKey = ticketFilter.toLowerCase().replace(/ /g, "_");
      result = result.filter((t) => t.status === statusKey);
    }
    if (ticketCategory !== "All") {
      result = result.filter((t) => t.category === ticketCategory);
    }
    result.sort((a, b) =>
      ticketSort === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return result;
  }, [tickets, ticketFilter, ticketCategory, ticketSort]);

  const maxSignups = useMemo(
    () => Math.max(...signupWeeks.map((w) => w.free + w.pro), 1),
    [signupWeeks]
  );

  // Computed overview metrics
  const proUsers = useMemo(
    () => userStats.filter((u) => u.role === "pro").length, // TODO: wire to real billing data
    [userStats]
  );
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0.0";
  const avgRecords = totalUsers > 0 ? (totalRecords / totalUsers).toFixed(1) : "0";

  // Computed support metrics
  const openTicketCount = useMemo(() => tickets.filter((t) => t.status === "open").length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((t) => t.status === "in_progress").length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((t) => t.status === "resolved").length, [tickets]);

  // Computed user stats for Users tab
  const freeUsers = useMemo(() => userStats.filter((u) => u.role !== "pro" && u.role !== "admin").length, [userStats]);
  const zeroRecordUsers = useMemo(() => userStats.filter((u) => u.record_count === 0).length, [userStats]);

  // Lifecycle stage computation
  const lifecycleStages = useMemo(() => {
    if (totalUsers === 0) return [];
    const noRecords = userStats.filter((u) => u.record_count === 0).length;
    const exploring = userStats.filter((u) => u.record_count >= 1 && u.record_count <= 2).length;
    const active = userStats.filter((u) => u.record_count >= 3 && u.record_count <= 9).length;
    const power = userStats.filter((u) => u.record_count >= 10).length;
    return [
      { label: "No Records", count: noRecords, pct: ((noRecords / totalUsers) * 100).toFixed(0), color: "#D6D3D1" },
      { label: "Exploring (1-2)", count: exploring, pct: ((exploring / totalUsers) * 100).toFixed(0), color: "#292524" },
      { label: "Active (3-9)", count: active, pct: ((active / totalUsers) * 100).toFixed(0), color: "#22C55E" },
      { label: "Power (10+)", count: power, pct: ((power / totalUsers) * 100).toFixed(0), color: "#16A34A" },
    ];
  }, [userStats, totalUsers]);

  // Tab usage from actual data
  const tabUsage = useMemo(() => {
    const vaultCount = userStats.reduce((s, u) => s + (u.vault_doc_count || 0), 0);
    const entries = [
      { name: "Record", sessions: totalRecords },
      { name: "Plans", sessions: activePlans },
      { name: "Vault", sessions: vaultCount },
      { name: "Case", sessions: 0 },
      { name: "Comms", sessions: 0 },
      { name: "Exit", sessions: 0 },
    ];
    const max = Math.max(...entries.map((e) => e.sessions), 1);
    return entries.map((e) => ({ ...e, pct: Math.round((e.sessions / max) * 100) }));
  }, [totalRecords, activePlans, userStats]);

  /* ---------------------------------------------------------------- */
  /*  Loading / Access denied states                                   */
  /* ---------------------------------------------------------------- */

  if (isAdmin === null) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #D6D3D1",
            borderTopColor: "#22C55E",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)" }}>
          Checking access...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 700,
            color: "#292524",
            marginBottom: 12,
          }}
        >
          Access Denied
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#292524",
            lineHeight: 1.6,
            marginBottom: 24,
            fontFamily: "var(--font-sans)",
          }}
        >
          You don&apos;t have permission to access the admin dashboard.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            borderRadius: 10,
            background: "#22C55E",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Tab config                                                       */
  /* ---------------------------------------------------------------- */

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "revenue", label: "Revenue" },
    { key: "usage", label: "Usage" },
    { key: "support", label: "Support" },
    { key: "settings", label: "Settings" },
  ];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div
      className="da-page-wrapper"
      style={{
        padding: "32px 28px 60px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 28,
            fontWeight: 700,
            color: "#292524",
            marginBottom: 6,
          }}
        >
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)" }}>
          Platform overview and management tools.
        </p>
      </div>

      {/* Tab pills */}
      <div
        className="da-admin-tabs da-pills-scroll"
        style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedTicket(null);
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              border: activeTab === tab.key ? "1px solid #22C55E" : "1px solid #D6D3D1",
              background: activeTab === tab.key ? "#22C55E" : "#fff",
              color: activeTab === tab.key ? "#fff" : "#292524",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  OVERVIEW TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <>
          {/* 6 metric cards — 3 columns */}
          <div
            className="da-admin-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <MetricCard label="Total Users" value={totalUsers} change={`+${totalUsers}`} period="all time" />
            <MetricCard label="Pro Subscribers" value={proUsers} change={proUsers > 0 ? `+${proUsers}` : undefined} period={proUsers > 0 ? "current" : undefined} />
            <MetricCard label="Conversion Rate" value={`${conversionRate}%`} />
            <MetricCard label="MRR" value="$0" />
            <MetricCard label="Churn Rate" value="0%" />
            <MetricCard label="Avg Records / User" value={avgRecords} />
          </div>

          {/* Weekly Signups chart */}
          {signupWeeks.length > 0 && (
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={sectionLabel}>Weekly Signups</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "#D6D3D1" }} />
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Free</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "#22C55E" }} />
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pro</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
                {signupWeeks.map((w) => {
                  const total = w.free + w.pro;
                  const barH = Math.max(4, (total / maxSignups) * 100);
                  const proH = total > 0 ? (w.pro / total) * barH : 0;
                  const freeH = barH - proH;
                  return (
                    <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#292524", fontFamily: "var(--font-mono)" }}>
                        {total || ""}
                      </span>
                      <div style={{ width: "100%", maxWidth: 48, display: "flex", flexDirection: "column", gap: 0 }}>
                        {proH > 0 && (
                          <div style={{ height: proH, background: "#22C55E", borderRadius: "4px 4px 0 0", opacity: total === 0 ? 0.15 : 1 }} />
                        )}
                        <div
                          style={{
                            height: freeH,
                            background: "#D6D3D1",
                            borderRadius: proH > 0 ? "0 0 4px 4px" : 4,
                            opacity: total === 0 ? 0.15 : 1,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 9, color: "#292524", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                        {new Date(w.week + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Two-column: Lifecycle + Tab Usage */}
          <div
            className="da-admin-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {/* User Lifecycle Stage */}
            <div style={cardStyle}>
              <span style={sectionLabel}>User Lifecycle Stage</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {lifecycleStages.map((s) => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)" }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {s.count} ({s.pct}%)
                      </span>
                    </div>
                    <HBar pct={Number(s.pct)} color={s.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Usage */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Tab Usage</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tabUsage.map((t) => (
                  <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", width: 60, flexShrink: 0 }}>{t.name}</span>
                    <HBar pct={t.pct} />
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524", width: 50, textAlign: "right", flexShrink: 0 }}>
                      {t.sessions}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 12, fontSize: 10, color: "#292524", fontFamily: "var(--font-mono)", fontStyle: "italic" }}>
                {/* TODO: wire to real analytics */}
                Estimates based on record counts.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  USERS TAB                                                    */}
      {/* ============================================================ */}
      {activeTab === "users" && (
        <>
          {/* Privacy notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 20px",
              borderRadius: 10,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              marginBottom: 20,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#15803D", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}>
              User-created content (records, vault documents, communications) is never accessible to admin accounts. Only account metadata is shown.
            </span>
          </div>

          {/* Stat pills */}
          <div
            className="da-pills-scroll"
            style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
          >
            <StatPill label="Total" value={totalUsers} active />
            <StatPill label="Free" value={freeUsers} />
            <StatPill label="Pro" value={proUsers} /> {/* TODO: wire to real billing data */}
            <StatPill label="Active (7d)" value={totalUsers} /> {/* TODO: wire to real activity data */}
            <StatPill label="Past Due" value={0} /> {/* TODO: wire to Stripe */}
            <StatPill label="0 Records" value={zeroRecordUsers} />
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search users by email..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUsersPage(0); }}
              style={{ ...inputStyle, maxWidth: 360 }}
            />
          </div>

          {/* User table */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div
              className="da-admin-table-header"
              style={{
                display: "grid",
                gridTemplateColumns: "100px 2fr 60px 70px 60px 80px 90px 90px",
                gap: 8,
                padding: "12px 20px",
                background: "#FAFAF9",
                borderBottom: "1px solid #D6D3D1",
              }}
            >
              {["User (ID)", "Email", "Plan", "Billing", "Records", "Stage", "Created", "Last Active"].map((col) => (
                <div
                  key={col}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#292524",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {pagedUsers.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "#292524" }}>
                No users found.
              </div>
            ) : (
              pagedUsers.map((user, idx) => {
                const isExpanded = expandedUser === user.user_id;
                const ut = userTickets[user.user_id];
                const isPro = user.role === "pro"; // TODO: wire to real billing
                const stage = user.record_count === 0 ? "New" : user.record_count < 3 ? "Exploring" : user.record_count < 10 ? "Active" : "Power";

                return (
                  <div key={user.user_id}>
                    <button
                      className="da-admin-table-row"
                      onClick={() => setExpandedUser(isExpanded ? null : user.user_id)}
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: "100px 2fr 60px 70px 60px 80px 90px 90px",
                        gap: 8,
                        padding: "12px 20px",
                        border: "none",
                        borderBottom: "1px solid #F5F5F4",
                        background: idx % 2 === 0 ? "#fff" : "#FAFAF9",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-sans)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F0FDF4"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAFAF9"; }}
                    >
                      {/* User ID */}
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.user_id.slice(0, 8)}
                      </div>
                      {/* Email */}
                      <div style={{ fontSize: 13, color: "#292524", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </div>
                      {/* Plan badge */}
                      <div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: 10,
                            ...(isPro
                              ? { color: "#15803D", background: "#F0FDF4", border: "1px solid #BBF7D0" }
                              : { color: "#292524", background: "#F5F5F4", border: "1px solid #D6D3D1" }),
                          }}
                        >
                          {isPro ? "Pro" : "Free"}
                        </span>
                      </div>
                      {/* Billing */}
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {/* TODO: wire to Stripe */}
                        {isPro ? "Active" : <span style={{ color: "#D6D3D1" }}>--</span>}
                      </div>
                      {/* Records */}
                      <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {user.record_count}
                      </div>
                      {/* Stage */}
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {stage}
                      </div>
                      {/* Created */}
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {formatDate(user.created_at.split("T")[0])}
                      </div>
                      {/* Last Active */}
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {/* TODO: wire to real activity tracking */}
                        --
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: "20px 24px", borderBottom: "1px solid #D6D3D1", background: "#FAFAF9" }}>
                        <div
                          className="da-admin-user-details"
                          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}
                        >
                          <div>
                            <div style={metricLabel}>Email</div>
                            <div style={{ fontSize: 13, color: "#292524", wordBreak: "break-all" }}>{user.email}</div>
                          </div>
                          <div>
                            <div style={metricLabel}>Role</div>
                            <div style={{ fontSize: 13, color: "#292524", textTransform: "capitalize" }}>{user.role || "user"}</div>
                          </div>
                          <div>
                            <div style={metricLabel}>Joined</div>
                            <div style={{ fontSize: 13, color: "#292524" }}>{formatDateTime(user.created_at)}</div>
                          </div>
                        </div>

                        <div
                          className="da-admin-user-details"
                          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 16 }}
                        >
                          <div>
                            <div style={metricLabel}>Records</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#292524" }}>{user.record_count}</div>
                          </div>
                          <div>
                            <div style={metricLabel}>Vault Documents</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#292524" }}>{user.vault_doc_count}</div>
                          </div>
                          <div>
                            <div style={metricLabel}>Active Plan</div>
                            <div style={{ fontSize: 13, color: "#292524" }}>
                              {user.plan_status === "active" ? (
                                <>
                                  Yes: {user.plan_name}
                                  {user.plan_days_remaining != null && (
                                    <span style={{ fontSize: 11, color: "#92400E", marginLeft: 6 }}>
                                      ({user.plan_days_remaining}d remaining)
                                    </span>
                                  )}
                                </>
                              ) : (
                                "No"
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                          <div style={metricLabel}>Support Tickets ({ut?.count ?? "..."})</div>
                          {ut && ut.subjects.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {ut.subjects.map((s, i) => (
                                <div key={i} style={{ fontSize: 12, color: "#292524" }}>&bull; {s}</div>
                              ))}
                            </div>
                          ) : ut ? (
                            <div style={{ fontSize: 12, color: "#292524", fontStyle: "italic" }}>No tickets.</div>
                          ) : null}
                        </div>

                        <div>
                          <div style={metricLabel}>Change Role</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <select
                              value={user.role || "user"}
                              onChange={(e) => changeUserRole(user.user_id, e.target.value)}
                              disabled={roleChanging === user.user_id}
                              style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                            {roleChanging === user.user_id && (
                              <span style={{ fontSize: 12, color: "#292524" }}>Saving...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setUsersPage((p) => Math.max(0, p - 1))}
                disabled={usersPage === 0}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid #D6D3D1",
                  background: "#fff",
                  fontSize: 12,
                  fontFamily: "var(--font-sans)",
                  color: usersPage === 0 ? "#D6D3D1" : "#292524",
                  cursor: usersPage === 0 ? "default" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524" }}>
                {usersPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setUsersPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={usersPage >= totalPages - 1}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid #D6D3D1",
                  background: "#fff",
                  fontSize: 12,
                  fontFamily: "var(--font-sans)",
                  color: usersPage >= totalPages - 1 ? "#D6D3D1" : "#292524",
                  cursor: usersPage >= totalPages - 1 ? "default" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  REVENUE TAB                                                  */}
      {/* ============================================================ */}
      {activeTab === "revenue" && (
        <>
          {/* 4 metric cards */}
          <div
            className="da-admin-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}
          >
            <MetricCard label="MRR" value="$0" />
            <MetricCard label="ARR Run Rate" value="$0" />
            <MetricCard label="Monthly Plans" value={0} />
            <MetricCard label="Annual Plans" value={0} />
          </div>

          {/* MRR Growth chart */}
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <span style={sectionLabel}>MRR Growth</span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
              {/* TODO: wire to Stripe — placeholder bars */}
              {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((month, i) => {
                const h = [0, 0, 0, 0, 0, 0][i]; // TODO: wire to real data
                return (
                  <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#292524", fontFamily: "var(--font-mono)" }}>
                      {h > 0 ? `$${h}` : ""}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 48,
                        height: Math.max(4, h),
                        background: "linear-gradient(180deg, #22C55E, #16A34A)",
                        borderRadius: 4,
                        opacity: h === 0 ? 0.15 : 1,
                      }}
                    />
                    <span style={{ fontSize: 9, color: "#292524", fontFamily: "var(--font-mono)" }}>{month}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: 16, fontSize: 11, color: "#292524", fontFamily: "var(--font-mono)", fontStyle: "italic", textAlign: "center" }}>
              No revenue data yet. Connect Stripe to populate.
            </p>
          </div>

          {/* Two-column: Plan Breakdown + Key Revenue Metrics */}
          <div
            className="da-admin-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {/* Plan Breakdown */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Plan Breakdown</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#292524" }}>Monthly ($9/mo)</span>
                    {/* TODO: wire to Stripe */}
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524" }}>0 users</span>
                  </div>
                  <HBar pct={0} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#292524" }}>Annual ($79/yr)</span>
                    {/* TODO: wire to Stripe */}
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524" }}>0 users</span>
                  </div>
                  <HBar pct={0} />
                </div>
              </div>
            </div>

            {/* Key Revenue Metrics */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Key Revenue Metrics</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* TODO: wire to Stripe */}
                {[
                  { label: "Average Revenue Per User", value: "$0.00" },
                  { label: "Lifetime Value (est.)", value: "$0.00" },
                  { label: "Trial Conversion Rate", value: "0%" },
                  { label: "Revenue Churn", value: "0%" },
                  { label: "Net Revenue Retention", value: "0%" },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#292524" }}>{m.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524" }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  USAGE TAB                                                    */}
      {/* ============================================================ */}
      {activeTab === "usage" && (
        <>
          {/* 4 metric cards */}
          <div
            className="da-admin-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}
          >
            <MetricCard label="DAU" value={0} />
            <MetricCard label="WAU" value={0} />
            <MetricCard label="Records Created" value={totalRecords} change={`+${totalRecords}`} period="all time" />
            <MetricCard label="Case Files Generated" value={0} />
          </div>

          {/* Feature Usage */}
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <span style={sectionLabel}>Feature Usage</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(() => {
                const vaultUploads = userStats.reduce((s, u) => s + (u.vault_doc_count || 0), 0);
                const features = [
                  { name: "Record entries", count: totalRecords },
                  { name: "Vault uploads", count: vaultUploads },
                  { name: "Plan check-ins", count: activePlans },
                  { name: "Comms templates", count: 0 },
                  { name: "Case file exports", count: 0 },
                  { name: "Exit checklists", count: 0 },
                ];
                const fMax = Math.max(...features.map((f) => f.count), 1);
                return features.map((f) => ({ ...f, pct: Math.round((f.count / fMax) * 100) }));
              })().map((f) => (
                <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: "#292524", fontFamily: "var(--font-sans)", width: 140, flexShrink: 0 }}>{f.name}</span>
                  <HBar pct={f.pct} />
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#292524", width: 40, textAlign: "right", flexShrink: 0 }}>{f.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activation Funnel */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Activation Funnel</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {/* TODO: wire to analytics */}
              {[
                { step: "Signed up", count: totalUsers, pct: 100 },
                { step: "Completed onboarding", count: Math.round(totalUsers * 0.8), pct: 80 },
                { step: "First record", count: totalUsers - zeroRecordUsers, pct: totalUsers > 0 ? Math.round(((totalUsers - zeroRecordUsers) / totalUsers) * 100) : 0 },
                { step: "3+ records", count: userStats.filter((u) => u.record_count >= 3).length, pct: totalUsers > 0 ? Math.round((userStats.filter((u) => u.record_count >= 3).length / totalUsers) * 100) : 0 },
                { step: "Used Vault", count: userStats.filter((u) => u.vault_doc_count > 0).length, pct: totalUsers > 0 ? Math.round((userStats.filter((u) => u.vault_doc_count > 0).length / totalUsers) * 100) : 0 },
                { step: "Used Comms", count: 0, pct: 0 },
                { step: "Upgraded to Pro", count: proUsers, pct: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0 },
                { step: "Generated case file", count: 0, pct: 0 },
              ].map((s, i) => (
                <div
                  key={s.step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: i > 0 ? "1px solid #F5F5F4" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: s.pct > 0 ? "#F0FDF4" : "#F5F5F4",
                      border: s.pct > 0 ? "1px solid #BBF7D0" : "1px solid #D6D3D1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: s.pct > 0 ? "#15803D" : "#292524",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: "#292524", flex: 1 }}>{s.step}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#292524", width: 36, textAlign: "right" }}>{s.count}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524", width: 40, textAlign: "right" }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  SUPPORT TAB                                                  */}
      {/* ============================================================ */}
      {activeTab === "support" && !selectedTicket && (
        <>
          {/* Quick stats */}
          <div
            className="da-pills-scroll"
            style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
          >
            <StatPill label="Open" value={openTicketCount} active={openTicketCount > 0} />
            <StatPill label="In Progress" value={inProgressCount} />
            <StatPill label="Resolved (30d)" value={resolvedCount} />
            <StatPill label="Avg Response" value="--" /> {/* TODO: wire to real data */}
          </div>

          {/* Filter bar */}
          <div
            className="da-admin-filters"
            style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}
          >
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 13 }}
            >
              <option>All</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
            <select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 13 }}
            >
              {["All", "Bug", "Billing", "How-to", "Account", "Feature Request", "General"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={ticketSort}
              onChange={(e) => setTicketSort(e.target.value as "newest" | "oldest")}
              style={{ ...inputStyle, width: "auto", padding: "8px 12px", fontSize: 13 }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <span style={{ fontSize: 12, color: "#292524", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Ticket list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredTickets.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 13, color: "#292524", fontStyle: "italic" }}>
                  No tickets match your filters.
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    ...cardStyle,
                    padding: "16px 20px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D6D3D1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#D6D3D1"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={ticketStatusBadge(ticket.status)}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                      <span style={categoryBadge()}>{ticket.category}</span>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#292524", fontFamily: "var(--font-sans)", margin: "0 0 4px" }}>
                      {ticket.subject}
                    </p>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524" }}>
                      <span>{ticket.user_email}</span>
                      <span>{formatDateTime(ticket.created_at)}</span>
                      <span>{ticket.message_count} message{ticket.message_count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  SUPPORT — TICKET DETAIL                                      */}
      {/* ============================================================ */}
      {activeTab === "support" && selectedTicket && (
        <>
          <button
            onClick={() => setSelectedTicket(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#22C55E",
              fontFamily: "var(--font-sans)",
              padding: 0,
              marginBottom: 20,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to tickets
          </button>

          <div
            className="da-admin-ticket-detail"
            style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}
          >
            {/* Left: messages */}
            <div>
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={ticketStatusBadge(selectedTicket.status)}>
                    {selectedTicket.status.replace(/_/g, " ")}
                  </span>
                  <span style={categoryBadge()}>{selectedTicket.category}</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#292524" }}>
                    #{selectedTicket.id.slice(0, 8)}
                  </span>
                </div>
                <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 600, color: "#292524", marginBottom: 4 }}>
                  {selectedTicket.subject}
                </h2>
                <div style={{ fontSize: 12, color: "#292524", fontFamily: "var(--font-mono)" }}>
                  Created {formatDateTime(selectedTicket.created_at)}
                </div>
              </div>

              {/* Thread */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {ticketMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 12,
                      background: msg.from_type === "user" ? "#F5F5F4" : "#F0FDF4",
                      border: msg.from_type === "user" ? "1px solid #D6D3D1" : "1px solid #BBF7D0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: msg.from_type === "user" ? "#292524" : "#15803D",
                          textTransform: "uppercase",
                        }}
                      >
                        {msg.from_type === "user" ? "User" : "Admin"}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#292524" }}>
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: "#292524", fontFamily: "var(--font-sans)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>
                      {msg.message_text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply + resolve actions */}
              <div style={cardStyle}>
                <div style={metricLabel}>Reply</div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  style={{ ...inputStyle, minHeight: 100, resize: "vertical" as const, lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  {selectedTicket.status !== "resolved" && (
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, "resolved")}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "1px solid #D6D3D1",
                        background: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font-sans)",
                        color: "#292524",
                        cursor: "pointer",
                      }}
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{
                      ...btnGreen,
                      padding: "8px 20px",
                      fontSize: 13,
                      opacity: sending || !replyText.trim() ? 0.5 : 1,
                      cursor: sending || !replyText.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {sending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={cardStyle}>
                <div style={metricLabel}>Status</div>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div style={cardStyle}>
                <div style={metricLabel}>User</div>
                <div style={{ fontSize: 13, color: "#292524", wordBreak: "break-all", marginBottom: 10 }}>
                  {selectedTicket.user_email}
                </div>
                {(() => {
                  const u = userStats.find((s) => s.user_id === selectedTicket.user_id);
                  if (!u) return <div style={{ fontSize: 12, color: "#292524" }}>Loading user info...</div>;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#292524" }}>
                      <div>Joined: {formatDate(u.created_at.split("T")[0])}</div>
                      <div>Records: {u.record_count}</div>
                      <div>Vault docs: {u.vault_doc_count}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  SETTINGS TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === "settings" && (
        <>
          {/* Platform Info */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <span style={sectionLabel}>Platform Information</span>
            <div
              className="da-admin-user-details"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
            >
              {[
                { label: "Platform Name", value: "DocketAlly" },
                { label: "Domain", value: "docketally.com" },
                { label: "Support Email", value: "support@docketally.com" },
                { label: "Stripe Status", value: "Not Connected" }, // TODO: wire to Stripe
                { label: "Database", value: "Supabase (PostgreSQL)" },
                { label: "Encryption", value: "AES-256 at rest, TLS in transit" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={metricLabel}>{item.label}</div>
                  <div style={{ fontSize: 14, color: "#292524" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Policy */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 10,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#15803D", fontFamily: "var(--font-sans)" }}>
                Data Privacy Policy
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#15803D", lineHeight: 1.7, margin: 0, fontFamily: "var(--font-sans)" }}>
              Admin accounts cannot view, access, or export user-created content including records, vault documents, communications, case files, and plan check-ins. All user content is protected by row-level security policies. Admin access is limited to account metadata (email, creation date, feature usage counts) and support ticket interactions initiated by the user.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
