import { Routes, Route } from "react-router-dom";
import { AdminProvider } from "./AdminContext.jsx";
import AdminLayout from "./AdminLayout.jsx";
import "../admin.css";
import AdminLogin from "./AdminLogin.jsx";
import AdminOverview from "./pages/AdminOverview.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminUserDetail from "./pages/AdminUserDetail.jsx";
import AdminScans from "./pages/AdminScans.jsx";
import AdminScanDetail from "./pages/AdminScanDetail.jsx";
import AdminCompliance from "./pages/AdminCompliance.jsx";
import AdminWebsite from "./pages/AdminWebsite.jsx";
import AdminMessages from "./pages/AdminMessages.jsx";
import AdminNotifications from "./pages/AdminNotifications.jsx";
import AdminAnalytics from "./pages/AdminAnalytics.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import AdminAuditLogs from "./pages/AdminAuditLogs.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import AdminAnnouncements from "./pages/AdminAnnouncements.jsx";
import AdminSearch from "./pages/AdminSearch.jsx";
import AdminForbidden from "./pages/AdminForbidden.jsx";

export default function AdminApp() {
  return (
    <AdminProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/tree" element={<AdminUsers treeMode />} />
          <Route path="bin" element={<AdminUsers binMode />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="scans" element={<AdminScans />} />
          <Route path="scans/:id" element={<AdminScanDetail />} />
          <Route path="compliance" element={<AdminCompliance />} />
          <Route path="website" element={<AdminWebsite />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="search" element={<AdminSearch />} />
          <Route path="forbidden" element={<AdminForbidden />} />
        </Route>
      </Routes>
    </AdminProvider>
  );
}
