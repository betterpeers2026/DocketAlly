"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Login / Sign-Up page with branded split layout                     */
/* ------------------------------------------------------------------ */

type View = "login" | "signup" | "forgot" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* OTP state (used after email sign-up) */
  const [otp, setOtp] = useState("");

  /* ---- Auth handlers ---- */

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setView("otp");
      setMessage("Check your email for a verification code.");
    }
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard/billing`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a password reset link.");
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  function switchView(target: View) {
    setView(target);
    setError("");
    setMessage("");
    setOtp("");
  }

  /* ---- Shared input style ---- */

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

  const btnOAuth: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid #d6d3d1",
    background: "#fff",
    color: "#1c1917",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
  /*  DIVIDER                                                          */
  /* ================================================================ */

  const divider = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "24px 0",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "#e7e5e4" }} />
      <span
        style={{
          fontSize: 12,
          color: "#a8a29e",
          fontFamily: "var(--font-sans)",
        }}
      >
        or
      </span>
      <div style={{ flex: 1, height: 1, background: "#e7e5e4" }} />
    </div>
  );

  /* ================================================================ */
  /*  GOOGLE ICON                                                      */
  /* ================================================================ */

  const googleIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  /* ================================================================ */
  /*  APPLE ICON                                                       */
  /* ================================================================ */

  const appleIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1c1917">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );

  /* ================================================================ */
  /*  RIGHT PANEL CONTENT                                              */
  /* ================================================================ */

  function renderForm() {
    /* ---- OTP verification (after signup) ---- */
    if (view === "otp") {
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
            We sent a verification code to{" "}
            <strong style={{ color: "#44403C" }}>{email}</strong>
          </p>

          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="otp" style={labelStyle}>
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="00000000"
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
              <p
                style={{
                  fontSize: 13,
                  color: "#22C55E",
                  marginBottom: 14,
                }}
              >
                {message}
              </p>
            )}

            <button type="submit" disabled={loading} style={btnGreen}>
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <button
            onClick={() => switchView("signup")}
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
              marginTop: 16,
            }}
          >
            Use a different email
          </button>
        </>
      );
    }

    /* ---- Forgot password ---- */
    if (view === "forgot") {
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
            Reset your password
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
            Enter your email and we will send you a reset link.
          </p>

          <form onSubmit={handleForgotPassword}>
            <label htmlFor="reset-email" style={labelStyle}>
              Email address
            </label>
            <input
              id="reset-email"
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
            {message && (
              <p
                style={{
                  fontSize: 13,
                  color: "#22C55E",
                  marginBottom: 14,
                }}
              >
                {message}
              </p>
            )}

            <button type="submit" disabled={loading} style={btnGreen}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <button
            onClick={() => switchView("login")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              fontSize: 13,
              color: "#22C55E",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              marginTop: 16,
            }}
          >
            Back to log in
          </button>
        </>
      );
    }

    /* ---- Login ---- */
    if (view === "login") {
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
            Welcome back
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
            New to DocketAlly?{" "}
            <button
              onClick={() => switchView("signup")}
              style={{
                background: "none",
                border: "none",
                color: "#22C55E",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                padding: 0,
              }}
            >
              Sign up today.
            </button>
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-email" style={labelStyle}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <label htmlFor="login-pw" style={{ ...labelStyle, marginBottom: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#22C55E",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="login-pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 56 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "#78716c",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={btnGreen}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {divider}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => handleOAuth("google")} style={btnOAuth}>
              {googleIcon}
              Continue with Google
            </button>
            <button onClick={() => handleOAuth("apple")} style={btnOAuth}>
              {appleIcon}
              Continue with Apple
            </button>
          </div>
        </>
      );
    }

    /* ---- Sign Up ---- */
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
          Create your account
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
          Already have an account?{" "}
          <button
            onClick={() => switchView("login")}
            style={{
              background: "none",
              border: "none",
              color: "#22C55E",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              padding: 0,
            }}
          >
            Log in.
          </button>
        </p>

        <form onSubmit={handleSignUp}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="signup-name" style={labelStyle}>
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="signup-email" style={labelStyle}>
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="signup-pw" style={labelStyle}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="signup-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 56 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#78716c",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={btnGreen}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {divider}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => handleOAuth("google")} style={btnOAuth}>
            {googleIcon}
            Continue with Google
          </button>
          <button onClick={() => handleOAuth("apple")} style={btnOAuth}>
            {appleIcon}
            Continue with Apple
          </button>
        </div>
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
