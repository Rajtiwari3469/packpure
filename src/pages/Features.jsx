import { Link } from "react-router-dom";
import { useSite } from "../site.jsx";

export default function Features() {
  const { get } = useSite();
  const items = [];
  for (let i = 1; i <= 6; i++) {
    const title = get("features", `f${i}_title`);
    if (!title) continue;
    items.push({ title, text: get("features", `f${i}_text`) });
  }
  if (items.length === 0) {
    items.push(
      { title: "Image Scanning", text: "Upload packaging images or capture labels live with your device camera. Supports JPEG and PNG up to 10 MB." },
      { title: "OCR Extraction", text: "AI extracts visible text and declarations from labels, populating structured fields for review." },
      { title: "Legal Pack Pure Checks", text: "Every field is validated against configurable rules covering commodity name, manufacturer, quantity, MRP, manufacturing date, consumer care, and origin." }
    );
  }

  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">FEATURES</span>
        <h1>{get("features", "heading", "Built for reliable compliance")}</h1>
        <p>
          {get(
            "features",
            "description",
            "A professional, trustworthy toolkit for AI-assisted legal Pack Pure verification."
          )}
        </p>
      </section>

      <section className="pp-section">
        <div className="pp-features pp-features-grid">
          {items.map((f) => (
            <div className="pp-feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-cta">
        <h2>Put the feature set to work</h2>
        <p>Start scanning and build your compliance history today.</p>
        <Link to="/signup" className="pp-btn pp-btn-primary pp-btn-lg">
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
