import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api.js";

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [content, setContent] = useState({});
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPublicSite();
      setContent(data.content || {});
      setAnnouncement(data.announcement || null);
    } catch {
      // keep defaults if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const get = useCallback(
    (section, key, fallback = "") => {
      const v = content[`${section}.${key}`];
      return v !== undefined && v !== null ? v : fallback;
    },
    [content]
  );

  const value = { content, get, announcement, loading, refresh };
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within a SiteProvider");
  return ctx;
}
