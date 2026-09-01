const BASE = "/api/admin";

async function request(method, url, body) {
  const opts = {
    method,
    credentials: "include",
    headers: {},
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || res.statusText || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const adminApi = {
  me: () => request("GET", `${BASE}/auth/me`),
  login: (email, password) =>
    request("POST", `${BASE}/auth/login`, { email, password }),
  logout: () => request("POST", `${BASE}/auth/logout`),

  overview: () => request("GET", `${BASE}/overview`),
  activity: () => request("GET", `${BASE}/activity`),

  users: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    ).toString();
    return request("GET", `${BASE}/users${q ? `?${q}` : ""}`);
  },
  userTree: () => request("GET", `${BASE}/users/tree`),
  user: (id) => request("GET", `${BASE}/users/${id}`),
  setUserStatus: (id, status) =>
    request("PATCH", `${BASE}/users/${id}/status`, { status }),
  deleteUser: (id) => request("DELETE", `${BASE}/users/${id}`),
  restoreUser: (id) => request("POST", `${BASE}/users/${id}/restore`),
  userActivities: (id) => request("GET", `${BASE}/users/${id}/activities`),
  userLogins: (id) => request("GET", `${BASE}/users/${id}/logins`),

  scans: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    ).toString();
    return request("GET", `${BASE}/scans${q ? `?${q}` : ""}`);
  },
  scan: (id) => request("GET", `${BASE}/scans/${id}`),
  deleteScan: (id) => request("DELETE", `${BASE}/scans/${id}`),

  compliance: () => request("GET", `${BASE}/compliance`),
  createRule: (payload) => request("POST", `${BASE}/compliance`, payload),
  updateRule: (id, payload) => request("PATCH", `${BASE}/compliance/${id}`, payload),
  deleteRule: (id) => request("DELETE", `${BASE}/compliance/${id}`),

  website: () => request("GET", `${BASE}/website`),
  setContent: (section, key, value) =>
    request("POST", `${BASE}/website`, { section, key, value }),
  publish: () => request("POST", `${BASE}/website/publish`),
  versions: () => request("GET", `${BASE}/content/versions`),

  messages: () => request("GET", `${BASE}/messages`),
  setMessageStatus: (id, status) =>
    request("PATCH", `${BASE}/messages/${id}`, { status }),
  deleteMessage: (id) => request("DELETE", `${BASE}/messages/${id}`),

  notifications: () => request("GET", `${BASE}/notifications`),
  toggleNotification: (id) =>
    request("POST", `${BASE}/notifications/${id}/toggle`),
  markNotificationRead: (id) =>
    request("POST", `${BASE}/notifications/${id}/read`),
  readAllNotifications: () =>
    request("POST", `${BASE}/notifications/read-all`),
  archiveNotification: (id) =>
    request("POST", `${BASE}/notifications/${id}/archive`),
  badges: () => request("GET", `${BASE}/badges`),

  analytics: (range = 30) =>
    request("GET", `${BASE}/analytics?range=${range}`),
  reports: (type) => request("GET", `${BASE}/reports?type=${type}`),

  auditLogs: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
    ).toString();
    return request("GET", `${BASE}/audit-logs${q ? `?${q}` : ""}`);
  },

  settings: () => request("GET", `${BASE}/settings`),
  saveSettings: (payload) => request("POST", `${BASE}/settings`, payload),

  announcements: () => request("GET", `${BASE}/announcements`),
  createAnnouncement: (payload) =>
    request("POST", `${BASE}/announcements`, payload),
  updateAnnouncement: (id, payload) =>
    request("PATCH", `${BASE}/announcements/${id}`, payload),
  deleteAnnouncement: (id) =>
    request("DELETE", `${BASE}/announcements/${id}`),

  search: (q) => request("GET", `${BASE}/search?q=${encodeURIComponent(q)}`),
};
