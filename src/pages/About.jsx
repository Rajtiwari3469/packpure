import { Link } from "react-router-dom";
import { useSite } from "../site.jsx";

const VALUES = [
  {
    title: "Accuracy",
    text: "We put precise, explainable extraction and rule checks at the heart of every scan.",
  },
  {
    title: "Trust",
    text: "Built to feel like reliable government and compliance software — transparent and dependable.",
  },
  {
    title: "Privacy",
    text: "Your account and scan history belong to you. Data is stored per user and never exposed to others.",
  },
  {
    title: "Simplicity",
    text: "A clean, modern interface that anyone can use without training.",
  },
];

export default function About() {
  const { get } = useSite();
  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">ABOUT</span>
        <h1>{get("about", "heading", "AI-assisted legal Pack Pure, made simple")}</h1>
        <p>
          {get(
            "about",
            "description",
            "PackPure is a prototype platform that helps businesses and regulators verify that packaged commodities are labelled correctly before they reach consumers."
          )}
        </p>
      </section>

      <section className="pp-section">
        <div className="pp-section-head">
          <span className="pp-eyebrow">WHAT WE VALUE</span>
          <h2>The principles behind PackPure</h2>
        </div>
        <div className="pp-features pp-features-grid">
          {VALUES.map((v) => (
            <div className="pp-feature" key={v.title}>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-cta">
        <h2>See how it works for yourself</h2>
        <p>Explore the platform and verify your first label.</p>
        <div className="pp-hero-actions">
          <Link to="/signup" className="pp-btn pp-btn-primary pp-btn-lg">
            Create Account
          </Link>
          <Link to="/how-it-works" className="pp-btn pp-btn-ghost pp-btn-lg">
            How It Works
          </Link>
        </div>
      </section>
    </div>
  );
}
