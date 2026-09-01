import { useSite } from "../site.jsx";
import { Link } from "react-router-dom";

function parseBody(body) {
  const chunks = String(body || "")
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  const sections = [];
  let current = null;
  chunks.forEach((chunk) => {
    const m = chunk.match(/^(\d+)\.\s+(.+)$/);
    if (m) {
      current = { num: Number(m[1]), title: m[2], items: [] };
      sections.push(current);
    } else if (current) {
      current.items.push(chunk);
    } else {
      // content before any numbered heading
      sections.push({ num: null, title: null, items: [chunk] });
    }
  });
  return sections;
}

export default function LegalPage({ section, prefix, eyebrow, defaultHeading, slug, other }) {
  const { get } = useSite();
  const heading = get(section, `${prefix}_heading`, defaultHeading);
  const intro = get(section, `${prefix}_intro`);
  const updated = get(section, "last_updated", "");
  const sections = parseBody(get(section, `${prefix}_body`));

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pp-page pp-legal-page">
      <section className="pp-legal-hero">
        <span className="pp-eyebrow">{eyebrow}</span>
        <h1>{heading}</h1>
        {intro && <p className="pp-legal-lead">{intro}</p>}

        <div className="pp-legal-hero-actions">
          {updated && <span className="pp-legal-updated">📅 {updated}</span>}
          <div className="pp-legal-switch">
            <Link to="/privacy" className={`pp-legal-switch-btn${slug === "privacy" ? " active" : ""}`}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={`pp-legal-switch-btn${slug === "terms" ? " active" : ""}`}>
              Terms &amp; Services
            </Link>
          </div>
        </div>
      </section>

      {sections.length > 0 ? (
        <div className="pp-legal-layout">
          {sections.length > 1 && (
            <aside className="pp-legal-toc">
              <p className="pp-legal-toc-title">On this page</p>
              <ul>
                {sections.map(
                  (s, i) =>
                    s.num && (
                      <li key={i}>
                        <button onClick={() => scrollTo(`pp-legal-${s.num}`)}>
                          <span className="pp-legal-toc-num">{s.num}</span>
                          <span>{s.title}</span>
                        </button>
                      </li>
                    )
                )}
              </ul>
            </aside>
          )}

          <div className="pp-legal-sections">
            {sections.map((s, i) =>
              s.num ? (
                <section className="pp-legal-section" id={`pp-legal-${s.num}`} key={i}>
                  <div className="pp-legal-section-head">
                    <span className="pp-legal-num">{String(s.num).padStart(2, "0")}</span>
                    <h2>{s.title}</h2>
                  </div>
                  {s.items.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </section>
              ) : (
                <div className="pp-legal-intro-block" key={i}>
                  {s.items.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="pp-legal-sections">
          <p className="pp-legal-empty">This page is being drafted. Please check back soon.</p>
        </div>
      )}

    </div>
  );
}