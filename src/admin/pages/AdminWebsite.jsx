import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import { useSite } from "../../site.jsx";
import {
  Spinner, ErrorState, PageHeader, formatDate, useTitle, ConfirmModal,
} from "../ui.jsx";

const SCHEMA = {
  home: { label: "Homepage", fields: [
    { key: "hero_badge", label: "Hero Badge", type: "input" },
    { key: "hero_title1", label: "Title (line 1)", type: "input" },
    { key: "hero_title2", label: "Title (line 2)", type: "input" },
    { key: "hero_sub", label: "Hero Subtitle", type: "textarea" },
    { key: "hero_btn1", label: "Primary Button Text", type: "input" },
    { key: "hero_btn2", label: "Secondary Button Text", type: "input" },
    { key: "how_heading", label: "How it works heading", type: "input" },
    { key: "feature_heading", label: "Features heading", type: "input" },
    { key: "cta_heading", label: "CTA heading", type: "input" },
    { key: "cta_sub", label: "CTA subtext", type: "textarea" },
  ]},
  features: { label: "Features", fields: [
    { key: "heading", label: "Page heading", type: "input" },
    { key: "description", label: "Page description", type: "textarea" },
    ...[1,2,3,4,5,6].flatMap((i) => [
      { key: `f${i}_icon`, label: `Feature ${i} icon`, type: "input" },
      { key: `f${i}_title`, label: `Feature ${i} title`, type: "input" },
      { key: `f${i}_text`, label: `Feature ${i} text`, type: "textarea" },
    ]),
  ]},
  about: { label: "About Page", fields: [
    { key: "heading", label: "Heading", type: "input" },
    { key: "description", label: "Description", type: "textarea" },
  ]},
  branding: { label: "Branding", fields: [
    { key: "site_name", label: "Site Name", type: "input" },
    { key: "site_title", label: "Browser Tab Title", type: "input" },
    { key: "primary_color", label: "Primary Color", type: "color" },
  ]},
  general: { label: "General", fields: [
    { key: "contact_email", label: "Contact Email", type: "input" },
  ]},
  "footer": { label: "Footer", fields: [
    { key: "text", label: "Footer text", type: "input" },
    { key: "copyright", label: "Copyright Line", type: "input" },
  ]},
  legal: { label: "Legal Pages", fields: [
    { key: "privacy_heading", label: "Privacy Policy — Heading", type: "input" },
    { key: "privacy_intro", label: "Privacy Policy — Intro", type: "textarea" },
    { key: "privacy_body", label: "Privacy Policy — Body", type: "textarea" },
    { key: "terms_heading", label: "Terms — Heading", type: "input" },
    { key: "terms_intro", label: "Terms — Intro", type: "textarea" },
    { key: "terms_body", label: "Terms — Body", type: "textarea" },
    { key: "last_updated", label: "Last Updated Line", type: "input" },
  ]},
  announcement: { label: "Announcement Banner", fields: [
    { key: "enabled", label: "Show banner", type: "check" },
    { key: "text", label: "Announcement text", type: "textarea" },
  ]},
};

export default function AdminWebsite() {
  const { isSuperAdmin } = useAdmin();
  const { refresh } = useSite();
  const [content, setContent] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState("");
  const [history, setHistory] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  useTitle("Website Editor");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.website();
      setContent(d.content);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function saveSection(section) {
    setSaving(section);
    try {
      for (const { key } of SCHEMA[section].fields) {
        await adminApi.setContent(section, key, drafts[`${section}.${key}`]);
      }
      await load();
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving("");
    }
  }

  async function publish() {
    await adminApi.publish();
    setPublishConfirm(false);
    refresh();
  }

  async function openHistory(section, key) {
    const d = await adminApi.versions(section, key);
    setHistory({ section, key, list: d.versions || [] });
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Website Editor"
        sub="Changes appear on the public site immediately."
        actions={
          isSuperAdmin ? (
            <button className="adm-btn adm-btn-primary" onClick={() => setPublishConfirm(true)}>
              Publish All
            </button>
          ) : null
        }
      />

      <div className="adm-website-grid">
        {Object.keys(SCHEMA).map((section) => {
          const sectionData = content[section] || {};
          return (
            <div className="adm-card" key={section}>
              <div className="adm-card-head">
                <h2>{SCHEMA[section].label}</h2>
                {isSuperAdmin && (
                  <button className="adm-btn adm-btn-xs adm-btn-primary" onClick={() => saveSection(section)} disabled={saving === section}>
                    {saving === section ? "Saving…" : "Save"}
                  </button>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSection(section);
                }}
              >
                {SCHEMA[section].fields.map((f) => {
                  const val = drafts[`${section}.${f.key}`] !== undefined ? drafts[`${section}.${f.key}`] : sectionData[f.key];
                  return (
                    <label key={f.key} className="adm-field">
                      <span className="adm-field-head">
                        <span>{f.label}</span>
                        <button type="button" className="adm-link adm-history-link" onClick={() => openHistory(section, f.key)}>
                          history
                        </button>
                      </span>
                      {f.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={val ?? ""}
                          disabled={!isSuperAdmin}
                          onChange={(e) => setDrafts({ ...drafts, [`${section}.${f.key}`]: e.target.value })}
                        />
                      ) : f.type === "check" ? (
                        <input
                          type="checkbox"
                          checked={String(val) === "1"}
                          disabled={!isSuperAdmin}
                          onChange={(e) => setDrafts({ ...drafts, [`${section}.${f.key}`]: e.target.checked ? "1" : "0" })}
                        />
                      ) : f.type === "color" ? (
                        <span className="adm-color-line">
                          <input
                            type="color"
                            value={/^#[0-9a-f]{6}$/i.test(val || "") ? val : "#1b7a43" }
                            disabled={!isSuperAdmin}
                            onChange={(e) => setDrafts({ ...drafts, [`${section}.${f.key}`]: e.target.value })}
                          />
                          <code>{val || "not set"}</code>
                        </span>
                      ) : (
                        <input
                          value={val ?? ""}
                          disabled={!isSuperAdmin}
                          onChange={(e) => setDrafts({ ...drafts, [`${section}.${f.key}`]: e.target.value })}
                        />
                      )}
                    </label>
                  );
                })}
                {isSuperAdmin && (
                  <button className="adm-btn adm-btn-primary" type="submit" disabled={saving === section}>
                    {saving === section ? "Saving…" : `Save ${SCHEMA[section].label}`}
                  </button>
                )}
              </form>
            </div>
          );
        })}
      </div>

      {history && (
        <div className="adm-modal-overlay" onClick={() => setHistory(null)}>
          <div className="adm-modal adm-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="adm-card-head">
              <h3>Version History — {history.section}.{history.key}</h3>
              <button className="adm-btn adm-btn-ghost" onClick={() => setHistory(null)}>Close</button>
            </div>
            {history.list.length === 0 ? (
              <p className="adm-muted">No change history for this field.</p>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr><th>Changed</th><th>By</th><th>From</th><th>To</th></tr>
                </thead>
                <tbody>
                  {history.list.map((v) => (
                    <tr key={v.id}>
                      <td className="adm-muted">{formatDate(v.created_at)}</td>
                      <td>{v.changed_by_name || "—"}</td>
                      <td className="adm-cell-break">{v.old_value}</td>
                      <td className="adm-cell-break">{v.new_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={publishConfirm}
        title="Publish all website content?"
        message="This marks all current content as published and live on the public site."
        confirmText="Publish"
        tone="ok"
        onCancel={() => setPublishConfirm(false)}
        onConfirm={publish}
      />
    </div>
  );
}
