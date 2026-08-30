import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import {
  Spinner, PageHeader, useTitle,
} from "../ui.jsx";

export default function AdminSearch() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  useTitle("Search");

  async function run(term) {
    if (!term.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const d = await adminApi.search(term);
      setResults(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = results
    ? results.users.length + results.scans.length + results.messages.length + results.rules.length + results.announcements.length
    : 0;

  return (
    <div>
      <PageHeader title="Global Search" sub="Search across users, scans, messages, rules and announcements." />
      <form
        className="adm-searchbar"
        onSubmit={(e) => { e.preventDefault(); run(q); }}
      >
        <input
          className="adm-input"
          placeholder="Type to search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button className="adm-btn adm-btn-primary" type="submit">Search</button>
      </form>

      {loading && <Spinner />}
      {results && !loading && total === 0 && (
        <div className="adm-empty"><p>No results for “{q}”.</p></div>
      )}
      {results && !loading && total > 0 && (
        <div className="adm-search-grid">
          {results.users.length > 0 && (
            <section className="adm-card">
              <h3 className="adm-card-title">Users ({results.users.length})</h3>
              <ul className="adm-search-list">
                {results.users.map((u) => (
                  <li key={u.id}><Link to={`/admin/users/${u.id}`}>{u.full_name}</Link><span>{u.email}</span></li>
                ))}
              </ul>
            </section>
          )}
          {results.scans.length > 0 && (
            <section className="adm-card">
              <h3 className="adm-card-title">Scans ({results.scans.length})</h3>
              <ul className="adm-search-list">
                {results.scans.map((s) => (
                  <li key={s.id}><Link to={`/admin/scans/${s.id}`}>{s.product_name}</Link><span>{s.user_name} · {s.status}</span></li>
                ))}
              </ul>
            </section>
          )}
          {results.messages.length > 0 && (
            <section className="adm-card">
              <h3 className="adm-card-title">Messages ({results.messages.length})</h3>
              <ul className="adm-search-list">
                {results.messages.map((m) => (
                  <li key={m.id}><Link to="/admin/messages">{m.email || m.name}</Link><span>{m.subject || m.message}</span></li>
                ))}
              </ul>
            </section>
          )}
          {results.rules.length > 0 && (
            <section className="adm-card">
              <h3 className="adm-card-title">Rules ({results.rules.length})</h3>
              <ul className="adm-search-list">
                {results.rules.map((r) => (
                  <li key={r.id}><Link to="/admin/compliance">{r.name}</Link><span>{r.code}</span></li>
                ))}
              </ul>
            </section>
          )}
          {results.announcements.length > 0 && (
            <section className="adm-card">
              <h3 className="adm-card-title">Announcements ({results.announcements.length})</h3>
              <ul className="adm-search-list">
                {results.announcements.map((a) => (
                  <li key={a.id}><Link to="/admin/announcements">{a.title}</Link><span>{a.status}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
