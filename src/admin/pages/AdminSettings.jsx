import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import { useSite } from "../../site.jsx";
import {
  Spinner, ErrorState, PageHeader, useTitle,
} from "../ui.jsx";

export default function AdminSettings() {
  const { isSuperAdmin } = useAdmin();
  const { refresh } = useSite();
  const [content, setContent] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useTitle("Settings");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.settings();
      setContent(d.content);
      const f = {};
      Object.keys(d.content).forEach((s) => Object.keys(d.content[s]).forEach((k) => { f[`${s}.${k}`] = d.content[s][k]; }));
      setForm(f);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      const changes = [
        ["branding", "site_name"],
        ["branding", "site_title"],
        ["branding", "primary_color"],
        ["general", "contact_email"],
        ["footer", "text"],
        ["announcement", "enabled"],
        ["announcement", "text"],
      ];
      for (const [s, k] of changes) {
        if (Object.prototype.hasOwnProperty.call(form, `${s}.${k}`)) {
          await adminApi.saveSettings(s, k, form[`${s}.${k}`]);
        }
      }
      await load();
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div>
      <PageHeader
        title="Settings"
        sub="Branding and site-wide configuration."
        actions={isSuperAdmin ? <button className="adm-btn adm-btn-primary" onClick={saveAll} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button> : null}
      />

      <div className="adm-settings-grid">
        <section className="adm-card">
          <h3 className="adm-card-title">Branding</h3>
          <label className="adm-field"><span>Site Name</span><input value={form["branding.site_name"] ?? ""} disabled={!isSuperAdmin} onChange={(e) => set("branding.site_name", e.target.value)} /></label>
          <label className="adm-field"><span>Browser Tab Title</span><input value={form["branding.site_title"] ?? ""} disabled={!isSuperAdmin} onChange={(e) => set("branding.site_title", e.target.value)} /></label>
          <label className="adm-field"><span>Primary Color</span>
            <span className="adm-color-line">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(form["branding.primary_color"] || "") ? form["branding.primary_color"] : "#1b7a43"} disabled={!isSuperAdmin} onChange={(e) => set("branding.primary_color", e.target.value)} />
              <code>{form["branding.primary_color"] || "not set"}</code>
            </span>
          </label>
        </section>

        <section className="adm-card">
          <h3 className="adm-card-title">General & Footer</h3>
          <label className="adm-field"><span>Contact Email</span><input value={form["general.contact_email"] ?? ""} disabled={!isSuperAdmin} onChange={(e) => set("general.contact_email", e.target.value)} /></label>
          <label className="adm-field"><span>Footer Text</span><input value={form["footer.text"] ?? ""} disabled={!isSuperAdmin} onChange={(e) => set("footer.text", e.target.value)} /></label>
        </section>

        <section className="adm-card">
          <h3 className="adm-card-title">Announcement Banner</h3>
          <label className="adm-check-line">
            <input type="checkbox" checked={String(form["announcement.enabled"]) === "1"} disabled={!isSuperAdmin} onChange={(e) => set("announcement.enabled", e.target.checked ? "1" : "0")} />
            <span>Show announcement on public site</span>
          </label>
          <label className="adm-field"><span>Announcement Text</span><textarea rows={3} value={form["announcement.text"] ?? ""} disabled={!isSuperAdmin} onChange={(e) => set("announcement.text", e.target.value)} /></label>
        </section>
      </div>
    </div>
  );
}
