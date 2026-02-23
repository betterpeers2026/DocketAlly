export default function RecordPage() {
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
          background: "#fff",
          borderRadius: 16,
          border: "1px solid var(--color-stone-200)",
          padding: "56px 40px",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--color-green-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-green)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-stone-900)",
            marginBottom: 10,
          }}
        >
          No records yet
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--color-stone-500)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Start documenting workplace events. Every record you create builds
          your case over time.
        </p>

        <button
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
          New Record
        </button>
      </div>
    </div>
  );
}
