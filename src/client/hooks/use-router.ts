import { useState, useEffect, useCallback } from "react";

export type Route =
  | { name: "dashboard" }
  | { name: "explore" }
  | { name: "portal" }
  | { name: "properties" }
  | { name: "property"; id: number }
  | { name: "tenants" }
  | { name: "tenant"; id: number }
  | { name: "leases" }
  | { name: "applications" }
  | { name: "rent" }
  | { name: "maintenance" }
  | { name: "documents" }
  | { name: "settings" }
  | { name: "not-found" };

function parse(rawPath: string): Route {
  const path = rawPath.split("?")[0];
  if (path === "/" || path === "/dashboard") return { name: "dashboard" };
  if (path === "/explore" || path === "/listings") return { name: "explore" };
  if (path === "/portal" || path === "/resident") return { name: "portal" };
  if (path === "/properties") return { name: "properties" };

  let m = path.match(/^\/properties\/(\d+)$/);
  if (m) return { name: "property", id: parseInt(m[1], 10) };
  if (path === "/tenants") return { name: "tenants" };
  m = path.match(/^\/tenants\/(\d+)$/);
  if (m) return { name: "tenant", id: parseInt(m[1], 10) };
  if (path === "/leases") return { name: "leases" };
  if (path === "/applications") return { name: "applications" };
  if (path === "/rent") return { name: "rent" };
  if (path === "/maintenance") return { name: "maintenance" };
  if (path === "/documents") return { name: "documents" };
  if (path === "/settings") return { name: "settings" };
  return { name: "not-found" };
}


export function useRouter() {
  const [path, setPath] = useState<string>(
    () => window.location.pathname + window.location.search
  );

  const navigate = useCallback((to: string) => {
    const current = window.location.pathname + window.location.search;
    if (to === current) return;
    window.history.pushState(null, "", to);
    setPath(to);
  }, []);

  useEffect(() => {
    const handler = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return { path, route: parse(path), navigate };
}
