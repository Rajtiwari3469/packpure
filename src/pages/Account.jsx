import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError, showInfo } from "../notify.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Account() {
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .account()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setScanCount(data.scanCount);
        setForm({
          fullName: data.user.fullName,
          phone: data.user.phone || "",
          organization: data.user.organization || "",
          age: data.user.age ?? "",
        });
      })
      .catch((err) => {
        if (err.status === 401) {
          showInfo("Session expired", "Please log in again to continue.", { id: "sess-exp" });
        } else {
          showError("Failed to load account", "Could not load profile information.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateUser({
        fullName: form.fullName,
        phone: form.phone,
        organization: form.organization,
        age: form.age === "" ? null : Number(form.age),
      });
      setUser(updated);
      setEditing(false);
      showSuccess("Profile updated successfully.", "Your account details were saved.", { id: "profile-save" });
    } catch (err) {
      showError("Could not update profile", err.status === 401 ? "Your session has expired. Please log in again." : "Please check the highlighted fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleteErr("");
    const typed = (deleteName || "").trim();
    if (!typed) {
      setDeleteErr("Please type your profile name to confirm.");
      return;
    }
    if (typed !== (user?.fullName || "").trim()) {
      setDeleteErr("The name you entered does not match your profile name.");
      return;
    }
    setDeleting(true);
    try {
      await api.deleteAccount({ name: typed });
      await logout();
      setConfirmOpen(false);
      showSuccess(
        "Account deleted",
        "Your account and all associated data have been permanently removed."
      );
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteErr(
        err.message === "Incorrect name. Your account was not deleted."
          ? "The name you entered does not match your profile name."
          : err.message || "Could not delete your account."
      );
    } finally {
      setDeleting(false);
    }
  };

  const shareWebsite = async () => {
    const url = "https://packpure.vercel.app";
    const title = "PackPure — Verify Product Labels";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      showSuccess("Link copied", "packpure.vercel.app copied to clipboard.", { id: "share-copy" });
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      showError("Couldn't share", "Please copy the link manually: packpure.vercel.app", { id: "share-fail" });
    }
  };

  if (!user) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading account…</p>
      </div>
    );
  }

  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">ACCOUNT</span>
        <h1>Your profile</h1>
        <p>View and manage the details tied to your account.</p>
      </section>

      <section className="pp-account">
        <div className="pp-account-summary">
          <Avatar name={user.fullName} size="xl" />
          <div>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <p className="pp-account-role">{user.role}</p>
          </div>
        </div>

        <div className="pp-account-stats">
          <div className="pp-stat">
            <strong>{scanCount}</strong>
            <span>Total Scans</span>
          </div>
          <div className="pp-stat">
            <strong>
              {new Date(user.createdAt).toLocaleDateString()}
            </strong>
            <span>Member Since</span>
          </div>
        </div>

        <div className="pp-account-block">
          <div className="pp-account-block-head">
            <h3>Profile Information</h3>
            <button
              className="pp-btn pp-btn-ghost"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {editing ? (
            <form className="pp-form" onSubmit={save}>
              <div className="pp-field">
                <label>Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              <div className="pp-field">
                <label>Phone Number</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="pp-field-row">
                <div className="pp-field">
                  <label>Organization</label>
                  <input
                    name="organization"
                    value={form.organization}
                    onChange={handleChange}
                  />
                </div>
                <div className="pp-field">
                  <label>Age</label>
                  <input
                    name="age"
                    type="number"
                    min="1"
                    max="150"
                    value={form.age}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="pp-btn pp-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          ) : (
            <div className="pp-account-fields">
              <div className="pp-account-field">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="pp-account-field">
                <span>Phone</span>
                <strong>{user.phone || "—"}</strong>
              </div>
              <div className="pp-account-field">
                <span>Organization</span>
                <strong>{user.organization || "—"}</strong>
              </div>
              <div className="pp-account-field">
                <span>Age</span>
                <strong>{user.age ?? "—"}</strong>
              </div>
              <div className="pp-account-field">
                <span>Member Since</span>
                <strong>
                  {new Date(user.createdAt).toLocaleDateString()}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="pp-account-block">
          <div className="pp-account-block-head">
            <h3>Prefer to try it?</h3>
          </div>
          <p className="pp-account-danger-text">
            Share PackPure with others so they can verify product labels too.
          </p>
          <button
            className="pp-btn pp-share-btn"
            onClick={shareWebsite}
          >
            <span className="pp-share-icon" aria-hidden="true">
              {shareCopied ? "✓" : "➦"}
            </span>
            {shareCopied ? "Link Copied" : "Share Website Link"}
          </button>
        </div>

        <div className="pp-account-block pp-account-danger">
          <div className="pp-account-block-head">
            <h3>Delete Account</h3>
          </div>
          <p className="pp-account-danger-text">
            Permanently delete your account, scans, and all associated data.
            This action cannot be undone.
          </p>
          <button
            className="pp-btn pp-delete-btn"
            onClick={() => {
              setDeleteErr("");
              setDeleteName("");
              setConfirmOpen(true);
            }}
          >
            Delete Permanently
          </button>
        </div>
      </section>

      {confirmOpen && (
        <div className="pp-modal-overlay" onClick={() => !deleting && setConfirmOpen(false)}>
          <div className="pp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-head">
              <h3>Delete your account?</h3>
              <button
                className="pp-modal-close"
                aria-label="Close"
                onClick={() => !deleting && setConfirmOpen(false)}
              >
                ✕
              </button>
            </div>
            <p className="pp-modal-text">
              This action <strong>cannot be undone</strong>. This will
              permanently delete the account{" "}
              <strong>{user.email}</strong> and all of its scan history.
            </p>
            <div className="pp-delete-warning">
              ⚠ Permanently deleting your account will remove all your scans,
              requests, and personal data. There is no way to recover them.
            </div>
            <form className="pp-form" onSubmit={handleDelete}>
              <div className="pp-field">
                <label htmlFor="deleteName">
                  Please type <strong>{user.fullName}</strong> to confirm
                </label>
                <input
                  id="deleteName"
                  type="text"
                  placeholder={user.fullName}
                  value={deleteName}
                  onChange={(e) => {
                    setDeleteName(e.target.value);
                    setDeleteErr("");
                  }}
                  autoFocus
                />
              </div>
              {deleteErr && <div className="pp-form-error">{deleteErr}</div>}
              <div className="pp-modal-actions">
                <button
                  type="button"
                  className="pp-btn pp-btn-ghost"
                  onClick={() => !deleting && setConfirmOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pp-btn pp-delete-btn"
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
