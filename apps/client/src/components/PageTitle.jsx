import { useEffect } from "react";
import { useLocation } from "react-router";

function getPageTitle(pathname) {
  if (pathname === "/") {
    return "Ordanly — Project management";
  }

  if (pathname === "/login") {
    return "Log in — Ordanly";
  }

  if (pathname === "/register") {
    return "Create account — Ordanly";
  }

  if (pathname === "/impressum") {
    return "Impressum — Ordanly";
  }

  if (pathname === "/datenschutz") {
    return "Datenschutz — Ordanly";
  }

  if (pathname === "/app") {
    return "Projects — Ordanly";
  }

  if (pathname.startsWith("/app/projects/")) {
    return "Project workspace — Ordanly";
  }

  return "Page not found — Ordanly";
}

export function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);

  return null;
}
