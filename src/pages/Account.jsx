import { useEffect, useState } from "react";
import { showSuccess, showError, showInfo } from "../notify.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Account() {
  const { updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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
      </section>
    </div>
  );
}
