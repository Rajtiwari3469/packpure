import { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import { AuthProvider } from "./auth.jsx";
import { SiteProvider, useSite } from "./site.jsx";
import { GlobalNotifier } from "./notify.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

import Navbar from "./components/Navbar.jsx";

import AdminApp from "./admin/AdminApp.jsx";

import Home from "./pages/Home.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Features from "./pages/Features.jsx";
import About from "./pages/About.jsx";
import Help from "./pages/Help.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ScannerPage from "./pages/ScannerPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyScans from "./pages/MyScans.jsx";
import ScanDetails from "./pages/ScanDetails.jsx";
import Account from "./pages/Account.jsx";
import Settings from "./pages/Settings.jsx";

import "./App.css";

function Layout({ children }) {
  const { get } = useSite();
  const siteName = get("branding", "site_name", "PackPure");
  const siteTitle = get("branding", "site_title", "PackPure");
  const footerText = get("footer", "text", "AI-Assisted Legal Pack Pure Compliance · 2026");
  const copyright = get("footer", "copyright", `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`);
  useEffect(() => {
    document.title = siteTitle || "PackPure";
  }, [siteTitle]);
  return (
    <div className="app">
      <Navbar />
      <main className="pp-main">{children}</main>
      <footer className="pp-footer" role="contentinfo">
        <span>{siteName}</span>
        <span>{footerText}</span>
        <div className="pp-footer-links">
          <span className="pp-footer-copy">{copyright}</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span className="pp-footer-sep">·</span>
          <Link to="/terms">Terms & Services</Link>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteProvider>
        <GlobalNotifier />
        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route
            path="/how-it-works"
            element={
              <Layout>
                <HowItWorks />
              </Layout>
            }
          />
          <Route
            path="/features"
            element={
              <Layout>
                <Features />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <About />
              </Layout>
            }
          />
          <Route
            path="/help"
            element={
              <Layout>
                <Help />
              </Layout>
            }
          />
          <Route
            path="/privacy"
            element={
              <Layout>
                <Privacy />
              </Layout>
            }
          />
          <Route
            path="/terms"
            element={
              <Layout>
                <Terms />
              </Layout>
            }
          />

          {/* Auth */}
          <Route
            path="/login"
            element={
              <Layout>
                <LoginPage />
              </Layout>
            }
          />
          <Route
            path="/signup"
            element={
              <Layout>
                <SignupPage />
              </Layout>
            }
          />

          {/* Scanner: public page, scan action is auth-gated */}
          <Route
            path="/scanner"
            element={
              <Layout>
                <ScannerPage />
              </Layout>
            }
          />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <Layout>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/my-scans"
            element={
              <Layout>
                <ProtectedRoute>
                  <MyScans />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/my-scans/:id"
            element={
              <Layout>
                <ProtectedRoute>
                  <ScanDetails />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/account"
            element={
              <Layout>
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/profile"
            element={
              <Layout>
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              </Layout>
            }
          />
 

          <Route path="/admin/*" element={<AdminApp />} />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <Layout>
                <div className="pp-page">
                  <div className="pp-page-hero">
                    <span className="pp-eyebrow">404</span>
                    <h1>Page not found</h1>
                    <p>
                      The page you're looking for doesn't exist.
                    </p>
                    <a
                      className="pp-btn pp-btn-primary"
                      href="/"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              </Layout>
            }
          />
        </Routes>
        </SiteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;