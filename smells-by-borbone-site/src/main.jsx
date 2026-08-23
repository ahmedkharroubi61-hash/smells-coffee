import React from "react";
import ReactDOM from "react-dom/client";
import "./fonts.css"; // self-hosted Fraunces + Jost (no external Google Fonts request)
import App from "./App.jsx";

// Without this, any uncaught error in the app just unmounts everything --
// the page goes blank with no clue why. This catches that instead, shows
// what actually broke, and gives a way back in without losing everything
// (a reload). If this ever fires, screenshot the message it shows.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("SmellS by Borbone crashed:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            background: "#182B55",
            color: "#FDFBF5",
            padding: "32px 24px",
          }}
        >
          <h1 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "10px" }}>
            Une erreur est survenue
          </h1>
          <p style={{ opacity: 0.75, marginBottom: "22px", maxWidth: "420px", lineHeight: 1.5 }}>
            Le site a rencontré un problème inattendu. Rechargez la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#FDFBF5",
              color: "#182B55",
              border: "none",
              padding: "12px 28px",
              borderRadius: "4px",
              fontSize: "0.8rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recharger la page
          </button>
          <pre
            style={{
              marginTop: "28px",
              fontSize: "0.72rem",
              opacity: 0.55,
              maxWidth: "90vw",
              overflow: "auto",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {String(this.state.error?.message || this.state.error)}
            {this.state.error?.stack ? "\n\n" + this.state.error.stack : ""}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
