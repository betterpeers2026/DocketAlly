"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/components/SubscriptionProvider";
import { hasActiveAccess, trialDaysLeft } from "@/lib/subscription";

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #E7E5E4",
  padding: "28px 24px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const subscription = useSubscription();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Success toast
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  const isActive = hasActiveAccess(subscription);
  const isTrial = subscription.subscriptionStatus === "trial";
  const isPaid = subscription.subscriptionStatus === "active" || subscription.subscriptionStatus === "past_due";
  const days = trialDaysLeft(subscription.trialEndsAt);

  const planLabel =
    subscription.subscriptionPlan === "monthly"
      ? "Monthly"
      : subscription.subscriptionPlan === "quarterly"
      ? "Quarterly"
      : subscription.subscriptionPlan === "yearly"
      ? "Yearly"
      : null;

  return (
    <div className="da-page-wrapper" style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      {/* Success toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 12,
            padding: "14px 24px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            color: "#15803D",
            zIndex: 1000,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          Subscription activated successfully!
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 26,
            fontWeight: 700,
            color: "#292524",
            marginBottom: 8,
          }}
        >
          Billing
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#57534E",
            lineHeight: 1.6,
            fontFamily: "var(--font-sans)",
            maxWidth: 600,
          }}
        >
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Status Card */}
      <div
        style={{
          ...cardStyle,
          textAlign: "left",
          marginBottom: 32,
          padding: "28px 32px",
        }}
      >
        {isTrial && isActive && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#92400E",
                  background: "#FFFBEB",
                  padding: "4px 12px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  border: "1px solid #FDE68A",
                }}
              >
                Free Trial
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 8,
              }}
            >
              {days} day{days !== 1 ? "s" : ""} remaining
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                fontFamily: "var(--font-sans)",
                marginBottom: 16,
              }}
            >
              You have full access during your trial. Subscribe below to keep
              access after your trial ends.
            </p>
            {/* Progress bar */}
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "#E7E5E4",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  background: days <= 2 ? "#EF4444" : "#F59E0B",
                  width: `${Math.max(5, ((7 - days) / 7) * 100)}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </>
        )}

        {isPaid && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#15803D",
                  background: "#F0FDF4",
                  padding: "4px 12px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  border: "1px solid #BBF7D0",
                }}
              >
                {subscription.subscriptionStatus === "past_due" ? "Past Due" : "Active"}
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 8,
              }}
            >
              {planLabel ? `${planLabel} Plan` : "Pro Plan"}
            </h2>
            {subscription.subscriptionEndsAt && (
              <p
                style={{
                  fontSize: 14,
                  color: "#57534E",
                  fontFamily: "var(--font-sans)",
                  marginBottom: 16,
                }}
              >
                Next billing date:{" "}
                {new Date(subscription.subscriptionEndsAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <button
              onClick={handlePortal}
              disabled={loading === "portal"}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: "1px solid #D6D3D1",
                background: "#fff",
                color: "#292524",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: loading === "portal" ? "not-allowed" : "pointer",
                opacity: loading === "portal" ? 0.7 : 1,
                alignSelf: "flex-start",
              }}
            >
              {loading === "portal" ? "Opening..." : "Manage Subscription"}
            </button>
          </>
        )}

        {!isActive && !isTrial && (
          <>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 8,
              }}
            >
              No active subscription
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                fontFamily: "var(--font-sans)",
              }}
            >
              Subscribe below to regain full access to all DocketAlly features.
            </p>
          </>
        )}

        {isTrial && !isActive && (
          <>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                color: "#292524",
                marginBottom: 8,
              }}
            >
              Your free trial has ended
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                fontFamily: "var(--font-sans)",
              }}
            >
              Subscribe below to continue documenting and building your case.
            </p>
          </>
        )}
      </div>

      {/* Pricing Cards */}
      {!isPaid && (
        <>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              color: "#292524",
              marginBottom: 20,
            }}
          >
            Choose a plan
          </h2>

          <div
            className="da-billing-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Monthly */}
            <div style={{ ...cardStyle, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#78716C",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 16,
                  }}
                >
                  Monthly
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#292524",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  $12
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#78716C",
                    fontFamily: "var(--font-sans)",
                    marginBottom: 24,
                  }}
                >
                  per month
                </div>
              </div>
              <button
                onClick={() => handleCheckout("monthly")}
                disabled={loading === "monthly"}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 10,
                  border: "2px solid #22C55E",
                  background: "transparent",
                  color: "#22C55E",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  cursor: loading === "monthly" ? "not-allowed" : "pointer",
                  opacity: loading === "monthly" ? 0.7 : 1,
                }}
              >
                {loading === "monthly" ? "Loading..." : "Subscribe"}
              </button>
            </div>

            {/* Quarterly (highlighted) */}
            <div
              style={{
                ...cardStyle,
                border: "2px solid #22C55E",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#fff",
                  background: "#22C55E",
                  padding: "4px 14px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                Best Value
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#78716C",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 16,
                  }}
                >
                  Quarterly
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#292524",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  $30
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#78716C",
                    fontFamily: "var(--font-sans)",
                    marginBottom: 4,
                  }}
                >
                  every 3 months
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#15803D",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    marginBottom: 24,
                  }}
                >
                  $10/mo (save 17%)
                </div>
              </div>
              <button
                onClick={() => handleCheckout("quarterly")}
                disabled={loading === "quarterly"}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#22C55E",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  cursor: loading === "quarterly" ? "not-allowed" : "pointer",
                  opacity: loading === "quarterly" ? 0.7 : 1,
                  boxShadow: "0 1px 4px rgba(34,197,94,0.3)",
                }}
              >
                {loading === "quarterly" ? "Loading..." : "Subscribe"}
              </button>
            </div>

            {/* Yearly */}
            <div style={{ ...cardStyle, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#78716C",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 16,
                  }}
                >
                  Yearly
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#292524",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  $96
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#78716C",
                    fontFamily: "var(--font-sans)",
                    marginBottom: 4,
                  }}
                >
                  per year
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#15803D",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    marginBottom: 24,
                  }}
                >
                  $8/mo (save 33%)
                </div>
              </div>
              <button
                onClick={() => handleCheckout("yearly")}
                disabled={loading === "yearly"}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 10,
                  border: "2px solid #22C55E",
                  background: "transparent",
                  color: "#22C55E",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  cursor: loading === "yearly" ? "not-allowed" : "pointer",
                  opacity: loading === "yearly" ? 0.7 : 1,
                }}
              >
                {loading === "yearly" ? "Loading..." : "Subscribe"}
              </button>
            </div>
          </div>

          {/* Responsive style for mobile */}
          <style>{`
            @media (max-width: 700px) {
              .da-billing-grid { grid-template-columns: 1fr !important; max-width: 360px; margin-left: auto; margin-right: auto; }
            }
          `}</style>
        </>
      )}

      {/* Trust footer */}
      <div
        style={{
          padding: "16px 20px",
          background: "#FAFAF9",
          borderRadius: 10,
          border: "1px solid #F5F5F4",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#78716C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p
          style={{
            fontSize: 12,
            color: "#78716C",
            fontFamily: "var(--font-sans)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Payments are processed securely by Stripe. DocketAlly never stores your card details.
        </p>
      </div>
    </div>
  );
}
