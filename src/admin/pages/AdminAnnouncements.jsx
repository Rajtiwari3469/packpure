import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import { useSite } from "../../site.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, PageHeader, formatDate, useTitle,
} from "../ui.jsx";

const EMPTY = { title: "", message: "", status: "draft", priority: "normal", start_at: "", end_at: "" };

export default function AdminAnnouncements() {
  const { isSuperAdmin } = useAdmin();
  const { refresh } = useSite();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState(null);
  useTitle("Announcements");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.announcements();
      setList(d.announcements || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); }
  function openEdit(a) {
    setEditing(a);
    setForm({ title: a.title, message: a.message, status: a.status, priority: a.priority, start_at: a.start_at || "", end_at: a.end_at || "" });
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      message: form.message,
      status: form.status,
      priority: form.priority,
      start_at: form.start_at || null,
      end_at: form.end_at || null,
    };
    if (editing) await adminApi.updateAnnouncement(editing.id, payload);
    else await adminApi.createAnnouncement(payload);
    setEditing(null);
    load();
    refresh();
  }

  async function remove() {
    await adminApi.deleteAnnouncement(confirm.id);
    setConfirm(null);
    load();
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        sub="Live banners shown on the public site."
        actions={isSuperAdmin ? <button className="adm-btn adm-btn-primary" onClick={openCreate}>+ New Announcement</button> : null}
      />

      <div className="adm-cards-2">
        <section className="adm-card">
          <h3 className="adm-card-title">Announcements ({list.length})</h3>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : list.length === 0 ? (
            <EmptyState title="No announcements" sub="Create one to show a banner on the site." />
          ) : (
            <ul className="adm-ann-list">
              {list.map((a) => (
                <li key={a.id} className={a.status === "published" ? "" : "muted"}>
                  <div className="adm-ann-main">
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                    <div className="adm-ann-meta">
                      <StatusPill value={a.status} label={a.status} />
                      <span className={`adm-sev adm-sev-${a.priority}`}>{a.priority}</span>
                      <span className="adm-muted">{formatDate(a.created_at)}</span>
                      {a.start_at && <span className="adm-muted">from {a.start_at}</span>}
                      {a.end_at && <span className="adm-muted">until {a.end_at}</span>}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="adm-cols">
                      <button className="adm-btn adm-btn-xs" onClick={() => openEdit(a)}>Edit</button>
                      <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: a.id, title: a.title })}>Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isSuperAdmin && (editing || list.length >= 0) && (
          <section className="adm-card adm-sticky-form">
            <h3 className="adm-card-title">{editing ? "Edit Announcement" : "New Announcement"}</h3>
            <form onSubmit={save}>
              <label className="adm-field"><span>Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Maintenance notice" /></label>
              <label className="adm-field"><span>Message</span><textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
              <div className="adm-form-row2">
                <label className="adm-field"><span>Status</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="adm-field"><span>Priority</span>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>
              <label className="adm-field"><span>Start (YYYY-MM-DD)</span><input type="date" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></label>
              <label className="adm-field"><span>End (YYYY-MM-DD)</span><input type="date" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></label>
              <div className="adm-cols">
                <button className="adm-btn adm-btn-primary" type="submit">{editing ? "Save Changes" : "Create"}</button>
                {editing && <button type="button" className="adm-btn adm-btn-ghost" onClick={openCreate}>Cancel</button>}
              </div>
            </form>
          </section>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title="Delete announcement?"
        message={`Delete "${confirm?.title}"?`}
        confirmText="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}
