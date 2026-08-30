import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, PageHeader, useTitle,
} from "../ui.jsx";

const EMPTY = { code: "", name: "", description: "", severity: "medium", enabled: true };

export default function AdminCompliance() {
  const { isSuperAdmin } = useAdmin();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  useTitle("Compliance Rules");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.compliance();
      setRules(d.rules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
  }
  function openEdit(r) {
    setEditing(r);
    setForm({ code: r.code, name: r.name, description: r.description || "", severity: r.severity || "medium", enabled: !!r.enabled });
    setFormError(null);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Code and name are required.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await adminApi.updateRule(editing.id, { name: form.name, description: form.description, severity: form.severity, enabled: form.enabled });
      } else {
        await adminApi.createRule({ code: form.code, name: form.name, description: form.description, severity: form.severity, enabled: form.enabled });
      }
      setEditing(null);
      load();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await adminApi.deleteRule(confirm.id);
    setConfirm(null);
    load();
  }

  async function toggle(r) {
    await adminApi.updateRule(r.id, { enabled: !r.enabled });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Compliance Rules"
        sub="Rules used to evaluate scans."
        actions={isSuperAdmin ? <button className="adm-btn adm-btn-primary" onClick={openCreate}>+ New Rule</button> : null}
      />

      <div className="adm-cards-2">
        <div className="adm-card">
          <h3 className="adm-card-title">Rules</h3>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : rules.length === 0 ? (
            <EmptyState title="No rules yet" />
          ) : (
            <ul className="adm-rule-list">
              {rules.map((r) => (
                <li key={r.id} className={!r.enabled ? "muted" : ""}>
                  <div className="adm-rule-main">
                    <code>{r.code}</code>
                    <div>
                      <strong>{r.name}</strong>
                      <p>{r.description}</p>
                      <span className={`adm-sev adm-sev-${r.severity}`}>{r.severity}</span>
                      <StatusPill value={r.enabled ? "published" : "draft"} label={r.enabled ? "Enabled" : "Disabled"} />
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="adm-cols">
                      <button className="adm-btn adm-btn-xs" onClick={() => openEdit(r)}>Edit</button>
                      <button className="adm-btn adm-btn-xs" onClick={() => toggle(r)}>{r.enabled ? "Disable" : "Enable"}</button>
                      <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: r.id, name: r.code })}>Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isSuperAdmin && (
          <div className="adm-card adm-sticky-form">
            <div className="adm-card-head">
              <h2>{editing ? `Edit Rule · ${editing.code}` : "New Rule"}</h2>
              {editing && (
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-xs" onClick={openCreate}>
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={save}>
              <label className="adm-field">
                <span>Code</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. mrp" disabled={!!editing} />
              </label>
              <label className="adm-field">
                <span>Name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rule name" />
              </label>
              <label className="adm-field">
                <span>Description</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What does this rule check?" />
              </label>
              <label className="adm-field">
                <span>Severity</span>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="adm-check-line">
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                <span>Enabled</span>
              </label>
              {formError && <p className="adm-form-error">{formError}</p>}
              <button className="adm-btn adm-btn-primary adm-btn-block" type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Update Rule" : "Create Rule"}
              </button>
            </form>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title="Delete rule?"
        message={`Delete rule "${confirm?.name}"?`}
        confirmText="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}
