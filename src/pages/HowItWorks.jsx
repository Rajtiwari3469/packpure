const STEPS = [
  {
    title: "Capture the label",
    text: "Use your device camera or upload a clear image of the packaged commodity label. For best results, ensure the full declaration area is in frame and well lit.",
  },
  {
    title: "AI extraction",
    text: "PackPure runs OCR over the image and extracts key fields: commodity name, manufacturer, net quantity, MRP, manufacturing date, consumer care line, and country of origin.",
  },
  {
    title: "Compliance checks",
    text: "Each extracted declaration is evaluated against configurable Legal Pack Pure checks. Missing, malformed, or suspicious values are flagged for review.",
  },
  {
    title: "Explainable report",
    text: "You get a clear compliance report showing what was detected and whether each rule passed. Every issue is shown with context so you know exactly what to fix.",
  },
  {
    title: "Track your history",
    text: "Every scan is saved privately to your account, so you can revisit past analyses and monitor your verification work over time.",
  },
];

export default function HowItWorks() {
  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">HOW IT WORKS</span>
        <h1>Verifying labels, step by step</h1>
        <p>
          PackPure turns a photo of product packaging into an explainable
          Legal Pack Pure compliance report — in seconds.
        </p>
      </section>

      <section className="pp-section">
        <div className="pp-steps pp-steps-vertical">
          {STEPS.map((step, i) => (
            <div className="pp-step pp-step-wide" key={step.title}>
              <span className="pp-step-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
