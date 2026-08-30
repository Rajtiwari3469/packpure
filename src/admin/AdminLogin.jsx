import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showAdmin, showError } from "../notify.jsx";
import { useAdmin } from "./AdminContext.jsx";
import { useAuth } from "../auth.jsx";
import { useTheme } from "../useTheme.js";
import { useTitle } from "./ui.jsx";

export default function AdminLogin() {
  const { login, loading, admin } = useAdmin();
  const [theme, toggleTheme] = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  useTitle("Admin Login");

  const loggedInNonAdmin =
    isAuthenticated && user?.role !== "admin" && user?.role !== "super_admin";

  if (!loading && admin) {
    navigate("/admin", { replace: true });
  }

  if (loggedInNonAdmin) {
    return (
      <div className="adm-root adm-center-whole">
        <div className="adm-login-card">
          <div className="adm-login-brand">
            <span className="adm-brand-mark">PP</span>
            <h1>Access Denied</h1>
            <p>Your account doesn't have admin privileges.</p>
          </div>
          <a className="adm-btn adm-btn-block adm-btn-primary" href="/">
            Back to Public Site
          </a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      await login(email, password);
      showAdmin("Welcome back, Admin", "You are signed in to the admin dashboard.", { id: "admin-login" });
      navigate("/admin", { replace: true });
    } catch (err) {
      showError(
        "Login failed",
        err.status === 401
          ? "Invalid admin credentials."
          : err.message || "Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-root adm-login-page">
      <button
        className="adm-theme-toggle adm-login-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <div className="adm-login-card">
        <div className="adm-login-brand">
          <span className="adm-brand-mark">PP</span>
          <h1>PackPure <span>Admin</span></h1>
          <p>Sign in to manage the platform</p>
        </div>
        <form className="adm-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@packpure.com"
              autoComplete="username"
            />
          </label>
          <label>
            <span>Password</span>
            <div className="adm-pwd">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="adm-pwd-toggle" onClick={() => setShow((v) => !v)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <button className="adm-btn adm-btn-primary adm-btn-block" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <LinkHome />
      </div>
    </div>
  );
}

function LinkHome() {
  return (
    <a className="adm-login-back" href="/">← Back to public site</a>
  );
}
