"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid var(--color-stone-200)",
          padding: "48px 36px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Docket<span style={{ color: "var(--color-green)" }}>Ally</span>
        </div>

        {step === "email" ? (
          <>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-stone-900)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Sign in to your account
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                marginBottom: 32,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Enter your email and we&apos;ll send you a verification code.
            </p>

            <form onSubmit={handleSendOtp}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-stone-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--color-stone-200)",
                  fontSize: 15,
                  fontFamily: "var(--font-sans)",
                  color: "var(--color-stone-800)",
                  outline: "none",
                  marginBottom: 20,
                }}
              />

              {error && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#ef4444",
                    marginBottom: 16,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-green)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sending..." : "Continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-stone-900)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Check your email
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--color-stone-600)",
                marginBottom: 32,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              We sent an 8-digit code to{" "}
              <strong style={{ color: "var(--color-stone-700)" }}>
                {email}
              </strong>
            </p>

            <form onSubmit={handleVerifyOtp}>
              <label
                htmlFor="otp"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-stone-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
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
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--color-stone-200)",
                  fontSize: 24,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-stone-800)",
                  textAlign: "center",
                  letterSpacing: "0.3em",
                  outline: "none",
                  marginBottom: 20,
                }}
              />

              {error && (
                <p
                  style={{
                    fontSize: 13,
                    color: "#ef4444",
                    marginBottom: 16,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-green)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 16,
                }}
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>
            </form>

            <button
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-stone-500)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
