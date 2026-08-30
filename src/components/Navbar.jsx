import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../notify.jsx";
import Logo from "./Logo.jsx";
import Avatar from "./Avatar.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../auth.jsx";
import { useTheme } from "../useTheme.js";
import { useSite } from "../site.jsx";

const PUBLIC_LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/help", label: "Help" },
];

const AUTH_LINKS = [
  { to: "/", label: "Home" },
  { to: "/scanner", label: "Scanner" },
  { to: "/my-scans", label: "My Scans" },
  { to: "/about", label: "About" },
  { to: "/help", label: "Help" },
];

const USER_MENU_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/my-scans", label: "My Scans" },
  { to: "/account", label: "Profile" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const { get, announcement } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const links = isAuthenticated ? AUTH_LINKS : PUBLIC_LINKS;
  const isAdmin = isAuthenticated && (user?.role === "admin" || user?.role === "super_admin");

  useEffect(() => {
    const close = () => {
      setMenuOpen(false);
      setUserMenuOpen(false);
    };
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess("Logged out", "You have been logged out.");
    } catch {
      showError("Logout failed", "Please try again.");
    }
    setMenuOpen(false);
    setUserMenuOpen(false);
    navigate("/", { replace: true });
  };

  const goHome = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="pp-navbar">
      {announcement && announcement.message && (
        <div className="pp-announcement">
          {announcement.message}
        </div>
      )}
      <div className="pp-navbar-inner">
        <Logo onClick={goHome} brand={get("branding", "site_name", "PackPure")} />

        <nav className="pp-nav" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                isActive ? "pp-nav-link active" : "pp-nav-link"
              }
              onClick={() => {
                setMenuOpen(false);
                setUserMenuOpen(false);
              }}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pp-nav-right">
          <button
            className="pp-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          {isAuthenticated ? (
            <div className="pp-user">
              <NotificationBell />
              <button
                className="pp-user-trigger"
                onClick={() =>
                  setUserMenuOpen((v) => !v)
                }
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <Avatar name={user?.fullName} size="md" />
                <span className="pp-user-name">
                  {user?.fullName?.split(" ")[0] ||
                    "User"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="pp-user-menu" role="menu">
                  <div className="pp-user-menu-head">
                    <Avatar name={user?.fullName} size="lg" />
                    <div>
                      <strong>{user?.fullName}</strong>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  {USER_MENU_LINKS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="pp-user-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="pp-user-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    className="pp-user-menu-item danger"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pp-nav-auth">
              <Link
                to="/login"
                className="pp-btn pp-btn-ghost"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="pp-btn pp-btn-primary"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}

          <button
            className="pp-hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="pp-mobile-menu">
          <nav className="pp-mobile-links" aria-label="Mobile navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "pp-mobile-link active"
                    : "pp-mobile-link"
                }
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="pp-mobile-actions">
            {isAuthenticated ? (
              <>
                <a
                  className="pp-btn pp-btn-ghost"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    navigate("/account");
                  }}
                >
                  Profile
                </a>
                <button
                  className="pp-btn pp-btn-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="pp-btn pp-btn-ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="pp-btn pp-btn-primary"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
