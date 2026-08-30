import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { api } from "./api.js";
import { showWarning } from "./notify.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevUserRef = useRef(null);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.me();
      if (prevUserRef.current && !data.user) {
        showWarning(
          "Session expired",
          "Your session has expired. Please log in again to continue.",
          { id: "session-expired" }
        );
      }
      setUser(data.user);
      prevUserRef.current = data.user;
    } catch {
      if (prevUserRef.current) {
        showWarning(
          "Session expired",
          "Your session has expired. Please log in again to continue.",
          { id: "session-expired" }
        );
      }
      setUser(null);
      prevUserRef.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload) => {
    const data = await api.login(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await api.signup(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback(async (payload) => {
    const data = await api.updateProfile(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, loading, login, signup, logout, refreshUser, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
