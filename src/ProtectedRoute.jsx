import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(
      location.pathname + location.search
    );
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}
