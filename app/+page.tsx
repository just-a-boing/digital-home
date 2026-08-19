export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "#fff",
        color: "#111",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            color: "#666",
            marginBottom: "18px",
            fontFamily: "monospace",
          }}
        >
          500
        </div>

        <h1
          style={{
            fontSize: "32px",
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "0 0 16px",
          }}
        >
          Internal Server Error
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: "16px",
            lineHeight: 1.6,
            color: "#666",
          }}
        >
          Something went wrong while trying to load this page.
          <br />
          Please try again later.
        </p>

        <div
          style={{
            padding: "16px 18px",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
            background: "#fafafa",
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#555",
            overflowX: "auto",
          }}
        >
          <div>ERROR_CODE: INTERNAL_SERVER_ERROR</div>
          <div style={{ marginTop: "6px" }}>
            STATUS: 500
          </div>
        </div>
      </section>
    </main>
  );
}
