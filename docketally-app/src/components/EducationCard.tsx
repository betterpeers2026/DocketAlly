"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Stable Supabase client (created once, shared across instances)     */
/* ------------------------------------------------------------------ */

const supabase = createClient();

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface EducationCardProps {
  pageKey: string;
  label: string;
  title: string;
  description: string;
  steps: [string, string, string];
  userId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EducationCard({ pageKey, label, title, description, steps, userId }: EducationCardProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hide by default until loaded
  const dismissingRef = useRef(false);

  // Check if this card was already dismissed
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase
        .from("profiles")
        .select("dismissed_edu_cards")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      if (error) {
        // Column may not exist yet; keep card hidden to avoid flash
        console.error("[EducationCard] fetch error:", error.message);
        return;
      }

      const cards = Array.isArray(data?.dismissed_edu_cards) ? (data.dismissed_edu_cards as string[]) : [];
      if (cards.includes(pageKey)) {
        setDismissed(true);
      } else {
        setDismissed(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true));
        });
      }
    }

    check();
    return () => { cancelled = true; };
  }, [userId, pageKey]);

  async function handleDismiss() {
    if (dismissingRef.current) return;
    dismissingRef.current = true;

    // Fade out immediately
    setVisible(false);

    // Hide locally after animation
    setTimeout(() => setDismissed(true), 200);

    if (!userId) return;

    // Persist dismissal to Supabase
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("dismissed_edu_cards")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("[EducationCard] dismiss fetch error:", fetchError.message);
        return;
      }

      const current = Array.isArray(data?.dismissed_edu_cards) ? (data.dismissed_edu_cards as string[]) : [];
      if (!current.includes(pageKey)) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ dismissed_edu_cards: [...current, pageKey] })
          .eq("id", userId);

        if (updateError) {
          console.error("[EducationCard] dismiss update error:", updateError.message);
        }
      }
    } catch (err) {
      console.error("[EducationCard] dismiss exception:", err);
    }
  }

  if (dismissed) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7E5E4",
        borderRadius: 10,
        borderLeft: "3px solid #22C55E",
        padding: "20px 24px",
        marginBottom: 20,
        position: "relative",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {/* Dismiss X */}
      <button
        onClick={handleDismiss}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          color: "#A8A29E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#292524"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#A8A29E"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>

      {/* Label */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        color: "#22C55E",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 6,
      }}>
        {label}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-sans)",
        fontSize: 16,
        fontWeight: 700,
        color: "#1C1917",
        marginBottom: 8,
      }}>
        {title}
      </div>

      {/* Description */}
      <p style={{
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "#78716C",
        lineHeight: 1.6,
        maxWidth: 600,
        margin: "0 0 16px",
      }}>
        {description}
      </p>

      {/* Steps row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {steps.map((text, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {/* Green numbered circle */}
              <div style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#22C55E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "#fff",
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "#57534E",
                whiteSpace: "nowrap",
              }}>
                {text}
              </span>
            </div>
            {/* Arrow separator (not after last) */}
            {i < 2 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
