import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminApi } from "./adminApi.js";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi.me();
      setAdmin(data.user);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const data = await adminApi.login(email, password);
    setAdmin(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch {
      /* ignore */
    }
    setAdmin(null);
  };

  const isSuperAdmin = admin?.role === "super_admin";

  return (
    <AdminContext.Provider
      value={{ admin, loading, refresh, login, logout, isSuperAdmin }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within an AdminProvider");
  return ctx;
}
