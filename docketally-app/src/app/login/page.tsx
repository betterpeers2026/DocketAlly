"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Login page with branded split layout, email OTP only               */
/* ------------------------------------------------------------------ */

type Step = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* Resend cooldown */
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /* ---- Auth handlers ---- */

  const sendOtp = useCallback(async () => {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
      setCooldown(60);
      setMessage("");
    }
  }, [email, supabase.auth]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    await sendOtp();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setOtp("");
    setError("");
    setMessage("");
    await sendOtp();
    setMessage("A new code has been sent.");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  function goBackToEmail() {
    setStep("email");
    setOtp("");
    setError("");
    setMessage("");
    setCooldown(0);
  }

  /* ---- Shared styles ---- */

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #d6d3d1",
    fontSize: 15,
    fontFamily: "var(--font-sans)",
    color: "#1c1917",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#1c1917",
    marginBottom: 6,
    fontFamily: "var(--font-sans)",
  };

  const btnGreen: React.CSSProperties = {
    width: "100%",
    padding: "14px 20px",
    borderRadius: 10,
    border: "none",
    background: "#22C55E",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  /* ---- Trust signals ---- */

  const trustItems = [
    "Private and encrypted. Only you can see your records.",
    "Your records organize into a case file automatically.",
    "Export anytime as a PDF or attorney packet.",
  ];

  /* ================================================================ */
  /*  LEFT PANEL                                                       */
  /* ================================================================ */

  const leftPanel = (
    <div
      className="da-login-left"
      style={{
        width: "46%",
        background: "#1c1917",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "rgba(34,197,94,0.04)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -40,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "rgba(34,197,94,0.03)",
          pointerEvents: "none",
        }}
      />

      {/* Thin vertical accent line */}
      <div
        style={{
          position: "absolute",
          right: 52,
          top: "50%",
          transform: "translateY(-50%)",
          width: 1,
          height: 100,
          background: "linear-gradient(180deg, transparent, rgba(34,197,94,0.3), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Top: Logo */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          Docket<span style={{ color: "#22C55E" }}>Ally</span>
        </div>
        <div
          style={{
            width: 36,
            height: 3,
            background: "#22C55E",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Center: Headline + subtitle + trust */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 42,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 20,
            maxWidth: 420,
          }}
        >
          What you write down today can{" "}
          <span style={{ color: "#22C55E" }}>save you</span> tomorrow.
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "#a8a29e",
            lineHeight: 1.65,
            maxWidth: 360,
            marginBottom: 36,
          }}
        >
          This is your space to build the record that protects your career.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {trustItems.map((text) => (
            <div
              key={text}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 14,
                  color: "#d6d3d1",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Links */}
      <div
        style={{
          display: "flex",
          gap: 20,
          fontSize: 12,
          fontFamily: "var(--font-sans)",
        }}
      >
        <a href="/terms" style={{ color: "#78716c", textDecoration: "none" }}>
          Terms of Service
        </a>
        <a href="/privacy" style={{ color: "#78716c", textDecoration: "none" }}>
          Privacy Policy
        </a>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  MOBILE HEADER (replaces left panel on small screens)             */
  /* ================================================================ */

  const mobileHeader = (
    <div
      className="da-login-mobile-header"
      style={{
        display: "none",
        background: "#1c1917",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 20,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 16,
        }}
      >
        Docket<span style={{ color: "#22C55E" }}>Ally</span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          margin: 0,
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        What you write down today can{" "}
        <span style={{ color: "#22C55E" }}>save you</span> tomorrow.
      </p>
    </div>
  );

  /* ================================================================ */
  /*  RIGHT PANEL CONTENT                                              */
  /* ================================================================ */

  function renderForm() {
    /* ---- Step 2: OTP verification ---- */
    if (step === "otp") {
      return (
        <>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 26,
              fontWeight: 600,
              color: "#1c1917",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Check your email
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#78716c",
              marginBottom: 28,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            We sent a 6-digit code to{" "}
            <strong style={{ color: "#44403C" }}>{email}</strong>
          </p>

          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="otp" style={labelStyle}>
              Sign-in code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              autoFocus
              style={{
                ...inputStyle,
                fontSize: 22,
                fontFamily: "var(--font-mono)",
                textAlign: "center",
                letterSpacing: "0.3em",
                marginBottom: 20,
              }}
            />

            {error && (
              <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>
                {error}
              </p>
            )}
            {message && (
              <p style={{ fontSize: 13, color: "#22C55E", marginBottom: 14 }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              style={{
                ...btnGreen,
                opacity: loading || otp.length < 6 ? 0.5 : 1,
                cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          {/* Resend */}
          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
            }}
          >
            {cooldown > 0 ? (
              <span style={{ color: "#a8a29e" }}>
                Resend code in {cooldown}s
              </span>
            ) : (
              <span style={{ color: "#78716c" }}>
                Didn&apos;t get it?{" "}
                <button
                  onClick={handleResend}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#22C55E",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Resend code
                </button>
              </span>
            )}
          </div>

          {/* Use different email */}
          <button
            onClick={goBackToEmail}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              fontSize: 13,
              color: "#78716c",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              marginTop: 12,
            }}
          >
            Use a different email
          </button>
        </>
      );
    }

    /* ---- Step 1: Email input ---- */
    return (
      <>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 26,
            fontWeight: 600,
            color: "#1c1917",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Sign in to DocketAlly
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#78716c",
            marginBottom: 28,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Enter your email and we&apos;ll send you a sign-in code.
        </p>

        <form onSubmit={handleSendOtp}>
          <label htmlFor="email" style={labelStyle}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {error && (
            <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={btnGreen}>
            {loading ? "Sending..." : "Send Code"}
          </button>
        </form>
      </>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .da-login-left { display: none !important; }
          .da-login-mobile-header { display: block !important; }
          .da-login-right {
            width: 100% !important;
            min-height: auto !important;
          }
          .da-login-wrapper {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div
        className="da-login-wrapper"
        style={{
          display: "flex",
          minHeight: "100vh",
          fontFamily: "var(--font-sans)",
        }}
      >
        {leftPanel}
        {mobileHeader}

        {/* Right panel */}
        <div
          className="da-login-right"
          style={{
            width: "54%",
            background: "#fafaf9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
            minHeight: "100vh",
          }}
        >
          <div style={{ width: "100%", maxWidth: 400 }}>
            {renderForm()}

            {/* Bottom disclaimer */}
            <p
              style={{
                fontSize: 11,
                color: "#a8a29e",
                textAlign: "center",
                lineHeight: 1.6,
                marginTop: 28,
              }}
            >
              By continuing, you agree to DocketAlly&apos;s{" "}
              <a href="/terms" style={{ color: "#a8a29e" }}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" style={{ color: "#a8a29e" }}>
                Privacy Policy
              </a>
              . Your data is encrypted and never shared.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
