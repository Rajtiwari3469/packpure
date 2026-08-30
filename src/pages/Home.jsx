import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useSite } from "../site.jsx";

function FeatureList() {
  const { get } = useSite();
  const items = [];
  for (let i = 1; i <= 6; i++) {
    const title = get("features", `f${i}_title`);
    if (!title) continue;
    items.push({
      icon: get("features", `f${i}_icon`, "📦"),
      title,
      text: get("features", `f${i}_text`),
    });
  }
  if (items.length === 0) {
    items.push(
      { icon: "📷", title: "Image Scanning", text: "Upload product packaging or capture it live with your camera for instant analysis." },
      { icon: "🔍", title: "OCR Extraction", text: "Extract visible text, declarations, and compliance fields directly from labels." },
      { icon: "⚖️", title: "Legal Pack Pure Rules", text: "Evaluate extracted fields against configurable Legal Pack Pure compliance checks." }
    );
  }
  return items;
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { get } = useSite();
  const features = FeatureList();

  const startScanning = () => {
    navigate("/scanner");
  };

  return (
    <div className="pp-home">
      <section className="pp-hero">
        <div className="pp-hero-inner">
          <div className="pp-hero-badge">
            <span className="pp-hero-dot" />
            {get("home", "hero_badge", "AI-ASSISTED LEGAL PACK PURE")}
          </div>

          <h1 className="pp-hero-title">
            {get("home", "hero_title1", "Verify product labels")}
            <br />
            <span>{get("home", "hero_title2", "before they reach consumers.")}</span>
          </h1>

          <p className="pp-hero-sub">
            {get(
              "home",
              "hero_sub",
              "Upload a packaged commodity label and analyze its declarations against configurable Legal Pack Pure checks."
            )}
          </p>

          <div className="pp-hero-actions">
            <button
              className="pp-btn pp-btn-primary pp-btn-lg"
              onClick={startScanning}
            >
              {get("home", "hero_btn1", "Start Scanning")}
            </button>
            <a className="pp-btn pp-btn-ghost pp-btn-lg" href="#how">
              {get("home", "hero_btn2", "Learn More")}
            </a>
          </div>
        </div>
      </section>

      <section className="pp-section" id="how">
        <div className="pp-section-head">
          <span className="pp-eyebrow">HOW IT WORKS</span>
          <h2>{get("home", "how_heading", "From label to compliance report in seconds")}</h2>
        </div>

        <div className="pp-steps">
          <div className="pp-step">
            <span className="pp-step-num">01</span>
            <h3>Scan</h3>
            <p>
              Upload an image of the product label or snap one with your
              camera.
            </p>
          </div>
          <div className="pp-step">
            <span className="pp-step-num">02</span>
            <h3>Extract</h3>
            <p>
              PackPure reads the label and pulls out key declarations through
              OCR.
            </p>
          </div>
          <div className="pp-step">
            <span className="pp-step-num">03</span>
            <h3>Verify</h3>
            <p>
              Automated checks compare each field against Legal Pack Pure
              rules.
            </p>
          </div>
          <div className="pp-step">
            <span className="pp-step-num">04</span>
            <h3>Act</h3>
            <p>
              Get a clear, explainable report so you can fix issues with
              confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="pp-section">
        <div className="pp-section-head">
          <span className="pp-eyebrow">FEATURES</span>
          <h2>{get("home", "feature_heading", "Everything you need for label compliance")}</h2>
        </div>

        <div className="pp-features">
          {features.map((f) => (
            <div className="pp-feature" key={f.title}>
              <span className="pp-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-cta">
        <h2>{get("home", "cta_heading", "Ready to verify your first label?")}</h2>
        <p>
          {get(
            "home",
            "cta_sub",
            "Create a free account to start scanning packaged commodities and building your compliance history."
          )}
        </p>
        <div className="pp-hero-actions">
          <button
            className="pp-btn pp-btn-primary pp-btn-lg"
            onClick={startScanning}
          >
            {isAuthenticated ? "Go to Scanner" : get("home", "hero_btn1", "Start Scanning")}
          </button>
          {!isAuthenticated && (
            <Link to="/signup" className="pp-btn pp-btn-ghost pp-btn-lg">
              Create Account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

