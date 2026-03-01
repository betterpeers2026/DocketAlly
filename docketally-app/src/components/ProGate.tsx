"use client";

import { useRouter } from "next/navigation";

export default function ProGate({ feature }: { feature: string }) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        padding: 40,
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 420,
          background: "var(--color-surface)",
          borderRadius: 16,
          border: "1px solid var(--color-stone-300)",
          padding: "56px 40px",
        }}
      >
        {/* Lock icon */}
        <div style={{ marginBottom: 20 }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-stone-300)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 700,
            color: "var(--color-green-text)",
            background: "var(--color-green-soft)",
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 20,
          }}
        >
          Pro Feature
        </div>

        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 24,
            fontWeight: 600,
            color: "var(--color-stone-900)",
            marginBottom: 12,
          }}
        >
          {feature}
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--color-stone-600)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Your free trial has ended. Subscribe to keep documenting and building
          your case.
        </p>

        <button
          onClick={() => router.push("/dashboard/billing")}
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
          View Plans
        </button>
      </div>
    </div>
  );
}
