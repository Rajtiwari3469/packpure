import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { showSuccess, showError } from "../notify.jsx";
import { useAuth } from "../auth.jsx";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get("redirect") || "/dashboard";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    age: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!/^[+]?[\d\s-]{10,15}$/.test(form.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signup({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        organization: form.organization,
        age: form.age ? Number(form.age) : null,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      showSuccess(
        "Account created successfully.",
        "Welcome to PackPure — you can start scanning labels right away.",
        { id: "signup-success" }
      );
      navigate(redirect, { replace: true });
    } catch (err) {
      const message =
        err.status === 409
          ? "An account with this email already exists."
          : err.message;
      setError(message);
      showError("Sign up failed", message, { id: "signup-error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pp-auth-page">
      <div className="pp-auth-card">
        <span className="pp-eyebrow">CREATE ACCOUNT</span>
        <h1>Join PackPure</h1>
        <p className="pp-auth-sub">
          Create an account to start scanning labels.
        </p>

        {error && <div className="pp-form-error">{error}</div>}

        <form className="pp-form" onSubmit={handleSubmit}>
          <div className="pp-field">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              value={form.fullName}
              onChange={handleChange}
            />
          </div>

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

          <div className="pp-field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="pp-field-row">
            <div className="pp-field">
              <label htmlFor="organization">Organization (optional)</label>
              <input
                id="organization"
                name="organization"
                type="text"
                autoComplete="organization"
                placeholder="Company / agency"
                value={form.organization}
                onChange={handleChange}
              />
            </div>

            <div className="pp-field">
              <label htmlFor="age">Age (optional)</label>
              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="150"
                placeholder="Age"
                value={form.age}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pp-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="pp-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="pp-btn pp-btn-primary pp-btn-block"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="pp-auth-switch">
          <span>Already have an account?</span>
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
