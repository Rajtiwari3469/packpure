import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, PageHeader, formatDate, useTitle,
} from "../ui.jsx";

export default function AdminMessages() {
  const { isSuperAdmin } = useAdmin();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  useTitle("Messages");

  const STATUSES = ["open", "pending", "resolved", "closed"];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.messages(statusFilter === "all" ? {} : { status: statusFilter });
      setMessages(d.messages || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function setStatus(id, status) {
    await adminApi.setMessageStatus(id, status);
    load();
  }
  async function remove() {
    await adminApi.deleteMessage(confirm.id);
    setConfirm(null);
    load();
  }

  return (
    <div>
      <PageHeader title="Messages" sub="Contact and support messages from the public." />
      <div className="adm-toolbar">
        <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : messages.length === 0 ? (
        <EmptyState title="No messages" sub="Messages sent through the contact form appear here." />
      ) : (
        <div className="adm-msg-list">
          {messages.map((m) => (
            <div className="adm-card adm-msg" key={m.id}>
              <div className="adm-msg-head">
                <div>
                  <strong>{m.name || m.user_name || "Anonymous"}</strong>
                  <span className="adm-user-mail">{m.email || m.user_name}</span>
                </div>
                <div className="adm-msg-meta">
                  <StatusPill value={m.status} label={m.status} />
                  <span className="adm-muted">{formatDate(m.created_at)}</span>
                </div>
              </div>
              {m.subject && <h4>{m.subject}</h4>}
              <p className="adm-msg-body">{m.message}</p>
              {isSuperAdmin && (
                <div className="adm-msg-actions">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      className={`adm-btn adm-btn-xs${m.status === s ? " adm-btn-primary" : ""}`}
                      onClick={() => setStatus(m.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                  <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: m.id })}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title="Delete message?"
        message="This will permanently delete the message."
        confirmText="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}
