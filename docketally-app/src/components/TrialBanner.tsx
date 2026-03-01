"use client";

import Link from "next/link";
import { useSubscription } from "@/components/SubscriptionProvider";
import { shouldShowTrialBanner, trialDaysLeft } from "@/lib/subscription";

export default function TrialBanner() {
  const sub = useSubscription();
  if (!shouldShowTrialBanner(sub)) return null;

  const days = trialDaysLeft(sub.trialEndsAt);
  const isUrgent = days <= 2;

  return (
    <div
      style={{
        padding: "10px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        background: isUrgent ? "#FEF2F2" : "#F0FDF4",
        color: isUrgent ? "#DC2626" : "#15803D",
        borderBottom: isUrgent ? "1px solid #FECACA" : "none",
        borderLeft: isUrgent ? "none" : "4px solid #22C55E",
        borderRadius: isUrgent ? 0 : "0 8px 8px 0",
        flexShrink: 0,
      }}
    >
      <span>
        Free trial: {days} day{days !== 1 ? "s" : ""} left
      </span>
      <Link
        href="/dashboard/billing"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: isUrgent ? "#DC2626" : "#15803D",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        Subscribe now
      </Link>
    </div>
  );
}
