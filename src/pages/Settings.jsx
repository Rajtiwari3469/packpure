import { useState } from "react";
import { showSecurity, showError } from "../notify.jsx";
import { api } from "../api.js";

export default function Settings() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      showSecurity(
        "Password changed successfully.",
        "A security notification was added to your account. Use a strong password you don't use elsewhere.",
        { id: "pw-change" }
      );
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.message);
      showError("Password not changed", err.status === 401 ? "Your session has expired. Please log in again." : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">SETTINGS</span>
        <h1>Account security</h1>
        <p>Manage your password and account security.</p>
      </section>

      <section className="pp-card pp-settings-card">
        <div className="pp-settings-block-head">
          <h3>Change Password</h3>
          <p>Use a strong password that you don't use elsewhere.</p>
        </div>

        {error && <div className="pp-form-error">{error}</div>}

        <form className="pp-form" onSubmit={handleSubmit}>
          <div className="pp-field">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Your current password"
              value={form.currentPassword}
              onChange={handleChange}
            />
          </div>

          <div className="pp-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.newPassword}
              onChange={handleChange}
            />
          </div>

          <div className="pp-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="pp-btn pp-btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Update Password"}
          </button>
        </form>
      </section>
    </div>
  );
}