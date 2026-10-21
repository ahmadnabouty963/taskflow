import { useEffect } from "react";
import { useLocation } from "react-router";
import { useLanguage } from "../context/language-context.js";

function getPageTitleKey(pathname) {
  if (pathname === "/") return "page.home";
  if (pathname === "/login") return "page.login";
  if (pathname === "/register") return "page.register";
  if (pathname === "/check-email" || pathname.startsWith("/verify-email/")) return "page.verify";
  if (pathname === "/forgot-password" || pathname.startsWith("/reset-password/")) return "page.recovery";
  if (pathname.startsWith("/invite/")) return "page.invitation";
  if (pathname === "/impressum") return "Impressum — Ordanly";
  if (pathname === "/datenschutz") return "Datenschutz — Ordanly";
  if (pathname === "/app") return "page.projects";
  if (pathname === "/app/today") return "page.today";
  if (pathname === "/app/upcoming") return "page.upcoming";
  if (pathname === "/app/calendar") return "page.calendar";
  if (pathname === "/app/settings") return "page.settings";
  if (pathname.startsWith("/app/projects/")) return "page.project";
  return "page.notFound";
}

function getPublicPage(pathname) {
  if (pathname === "/") {
    return { canonicalPath: "/", descriptionKey: "seo.homeDescription" };
  }

  if (pathname === "/impressum" || pathname === "/datenschutz") {
    return { canonicalPath: pathname, descriptionKey: "seo.legalDescription" };
  }

  return null;
}

function setMetaContent(selector, attribute, value) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export function PageTitle() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const titleKey = getPageTitleKey(pathname);
    const title = titleKey.includes(" — ") ? titleKey : t(titleKey);
    const publicPage = getPublicPage(pathname);
    const description = publicPage
      ? t(publicPage.descriptionKey)
      : "Ordanly account and workspace application.";

    document.title = title;
    setMetaContent('meta[name="description"]', "content", description);
    setMetaContent('meta[property="og:title"]', "content", title);
    setMetaContent('meta[property="og:description"]', "content", description);
    setMetaContent('meta[name="twitter:title"]', "content", title);
    setMetaContent('meta[name="twitter:description"]', "content", description);
    setMetaContent(
      'meta[name="robots"]',
      "content",
      publicPage ? "index, follow, max-image-preview:large" : "noindex, nofollow",
    );

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (publicPage) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = `https://ordanly.com${publicPage.canonicalPath}`;
    } else {
      canonical?.remove();
    }
  }, [pathname, t]);

  return null;
}
