const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Sends an anonymous page view. No cookies are sent, and visitors with Do
// Not Track or Global Privacy Control enabled are never counted.
export function trackPageView(path) {
  if (import.meta.env.MODE === "test") return;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;

  const referrer = document.referrer || null;
  try {
    fetch(`${API_URL}/api/analytics/pageview`, {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer }),
    }).catch(() => {});
  } catch {
    // Statistics must never break the app.
  }
}
