import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (
      formData.password !== formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    onLoginSuccess(formData);
  };

  return (
    <main className="login-page">
      {/* Background decoration */}
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <section className="login-shell">
        {/* Brand */}
        <div className="login-brand">
          <div className="brand-symbol">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1h3l2 4h-5v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-5l2-4h3V8Z" />
              <path d="M12 13v7M6 13v7M18 13v7" />
            </svg>
          </div>

          <div>
            <strong>
              Pack<em>Pure</em>
            </strong>
            <span>AI Compliance</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-header">
            <div className="brand-badge">
              PACK PURE AI
            </div>

            <h1>
              Compliance,
              <span> made intelligent.</span>
            </h1>

            <p>
              Create your account to access the
              product-label verification workspace.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            {/* Name */}
            <div className="input-group">
              <label htmlFor="name">
                Full Name
              </label>

              <div className="input-wrapper">
                <span className="input-icon">
                  ✦
                </span>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">
                Email Address
              </label>

              <div className="input-wrapper">
                <span className="input-icon">
                  @
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">
                <span className="input-icon">
                  ●
                </span>

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="input-group">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div className="input-wrapper">
                <span className="input-icon">
                  ●
                </span>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Repeat your password"
                  value={
                    formData.confirmPassword
                  }
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword
                    ? "◉"
                    : "○"}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
            >
              <span>Create Account</span>
              <span className="submit-arrow">
                →
              </span>
            </button>
          </form>

          <div className="login-divider">
            <span />
            <small>SECURE WORKSPACE</small>
            <span />
          </div>

          <p className="bottom-text">
            Your compliance workspace is ready for
            AI-assisted label verification.
          </p>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <span>Pack Pure AI</span>
          <span>Hackathon Prototype · 2026</span>
        </footer>
      </section>
    </main>
  );
}