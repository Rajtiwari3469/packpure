import { useTitle } from "../ui.jsx";

export default function AdminForbidden() {
  useTitle("Access Denied");
  return (
    <div className="adm-empty adm-empty-big">
      <div className="adm-empty-icon">🚫</div>
      <h1>Access Denied</h1>
      <p>You don't have permission to view the admin dashboard.</p>
      <a className="adm-btn adm-btn-primary" href="/">
        Go to Public Site
      </a>
    </div>
  );
}
