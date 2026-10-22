import { useEffect } from "react";
import { useLocation } from "react-router";
import { trackPageView } from "../lib/analytics.js";

export function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
