async function request(method, url, body) {
  const options = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  patch: (url, body) => request("PATCH", url, body),
  delete: (url) => request("DELETE", url),

  signup: (payload) => request("POST", "/api/auth/signup", payload),
  login: (payload) => request("POST", "/api/auth/login", payload),
  logout: () => request("POST", "/api/auth/logout"),
  me: () => request("GET", "/api/auth/me"),
  getUser: () => request("GET", "/api/user/me"),
  getStats: () => request("GET", "/api/user/stats"),
  updateProfile: (payload) => request("PATCH", "/api/user/profile", payload),
  changePassword: (payload) =>
    request("PATCH", "/api/user/password", payload),
  account: () => request("GET", "/api/account"),
  updateAccount: (payload) => request("PATCH", "/api/account", payload),
  deleteAccount: (payload) => request("DELETE", "/api/account", payload),
  getScans: () => request("GET", "/api/scans"),
  getScan: (id) => request("GET", `/api/scans/${id}`),
  createScan: (payload) => request("POST", "/api/scans", payload),
  deleteScan: (id) => request("DELETE", `/api/scans/${id}`),
  sendContact: (payload) => request("POST", "/api/contact", payload),
  getPublicSite: () => request("GET", "/api/public/site"),

  getNotifications: () => request("GET", "/api/notifications"),
  getNotifUnread: () => request("GET", "/api/notifications/unread"),
  markNotifRead: (id) => request("POST", `/api/notifications/${id}/read`),
  markAllNotifsRead: () => request("POST", "/api/notifications/read-all"),
  archiveNotif: (id) => request("POST", `/api/notifications/${id}/archive`),
  deleteNotif: (id) => request("DELETE", `/api/notifications/${id}`),
};
