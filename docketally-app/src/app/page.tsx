import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAF9",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-sans)" }}>
          <span style={{ color: "#292524" }}>Docket</span>
          <span style={{ color: "#22C55E" }}>Ally</span>
        </span>
        <Link
          href="/login"
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "1px solid #D6D3D1",
            background: "#fff",
            color: "#292524",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
          }}
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "80px 32px 60px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 44,
            fontWeight: 700,
            color: "#292524",
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          Document Your Work.
          <br />
          Protect Your Record.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#57534E",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto 36px",
          }}
        >
          The private workspace for employees to log workplace events, organize
          evidence, and build professional case files — before you need a lawyer.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "14px 36px",
            borderRadius: 12,
            border: "none",
            background: "#22C55E",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
          }}
        >
          Get Started Free
        </Link>
        <p
          style={{
            fontSize: 13,
            color: "#78716C",
            marginTop: 14,
          }}
        >
          7-day free trial. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 32px 80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
          className="da-landing-features"
        >
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              ),
              title: "Record Events",
              desc: "Log workplace conversations, decisions, and incidents with dates, details, and people involved.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              ),
              title: "Build Your Case",
              desc: "Organize records into cases, attach evidence from your vault, and track patterns over time.",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
              title: "Generate Case Files",
              desc: "Export professional PDF case files with timelines, pattern analysis, and attorney-ready summaries.",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E7E5E4",
                padding: "32px 28px",
                textAlign: "center",
              }}
            >
              <div style={{ marginBottom: 16 }}>{f.icon}</div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#292524",
                  fontFamily: "var(--font-sans)",
                  marginBottom: 10,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#57534E",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / Privacy */}
      <section
        style={{
          background: "#fff",
          borderTop: "1px solid #E7E5E4",
          borderBottom: "1px solid #E7E5E4",
          padding: "60px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 28,
              fontWeight: 700,
              color: "#292524",
              marginBottom: 16,
            }}
          >
            Your Data Stays Yours
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#57534E",
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            DocketAlly is built for privacy. Your employer never has access.
            You own everything you create.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Private by default", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
              { label: "No employer access", icon: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" },
              { label: "Export anytime", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#292524",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "60px 32px 80px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 700,
            color: "#292524",
            marginBottom: 16,
          }}
        >
          Start Your Free Trial
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "#57534E",
            lineHeight: 1.6,
            maxWidth: 440,
            margin: "0 auto 28px",
          }}
        >
          Begin documenting today. Your records could make the difference
          when it matters most.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "14px 36px",
            borderRadius: 12,
            border: "none",
            background: "#22C55E",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
          }}
        >
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #E7E5E4",
          padding: "24px 32px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 13, color: "#78716C", margin: 0 }}>
          &copy; {new Date().getFullYear()} DocketAlly. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
