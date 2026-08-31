import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { showSuccess, showError } from "../notify.jsx";
import { useAuth } from "../auth.jsx";
import PasswordField from "../components/PasswordField.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get("redirect") || "/dashboard";
  const suggest = searchParams.get("suggest");

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const u = await login({ email: form.email, password: form.password });
      const firstName = (u?.fullName || "").split(" ")[0] || "there";
      showSuccess(
        `Welcome back, ${firstName}!`,
        "You are now logged in to PackPure.",
        { id: "login-success" }
      );
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message);
      const msg =
        err.status === 401
          ? "Invalid email or password."
          : err.status === 403
          ? "This account has been disabled."
          : "Unable to log in. Please try again.";
      showError("Login failed", msg, { id: "login-error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pp-auth-page">
      <div className="pp-auth-card">
        {suggest === "scan" && (
          <div className="pp-auth-notice">
            Please log in to use the scanner.
          </div>
        )}

        <span className="pp-eyebrow">WELCOME BACK</span>
        <h1>Log in to PackPure</h1>
        <p className="pp-auth-sub">
          Access your scanner, scan history, and account.
        </p>

        {error && <div className="pp-form-error">{error}</div>}

        <form className="pp-form" onSubmit={handleSubmit}>
          <div className="pp-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="pp-btn pp-btn-primary pp-btn-block"
            disabled={loading}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <div className="pp-auth-switch">
          <span>Don't have an account?</span>
          <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
