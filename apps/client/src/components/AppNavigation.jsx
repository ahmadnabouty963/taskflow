import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { BrandLogo } from "./BrandLogo.jsx";
import { useAuth } from "../context/auth-context.js";
import { useLanguage } from "../context/language-context.js";

function Icon({ children }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
    >
      {children}
    </svg>
  );
}

const navItems = [
  {
    key: "projects",
    labelKey: "nav.projects",
    to: "/app",
    icon: (
      <Icon>
        <rect height="7" rx="1.5" width="7" x="3.5" y="3.5" />
        <rect height="7" rx="1.5" width="7" x="13.5" y="3.5" />
        <rect height="7" rx="1.5" width="7" x="3.5" y="13.5" />
        <rect height="7" rx="1.5" width="7" x="13.5" y="13.5" />
      </Icon>
    ),
  },
  {
    key: "today",
    labelKey: "nav.today",
    to: "/app/today",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </Icon>
    ),
  },
  {
    key: "upcoming",
    labelKey: "nav.upcoming",
    to: "/app/upcoming",
    icon: (
      <Icon>
        <path d="M4 12h14M13 6l6 6-6 6" />
      </Icon>
    ),
  },
  {
    key: "calendar",
    labelKey: "nav.calendar",
    to: "/app/calendar",
    icon: (
      <Icon>
        <rect height="16" rx="2" width="17" x="3.5" y="5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </Icon>
    ),
  },
  {
    key: "settings",
    labelKey: "nav.settings",
    shortLabelKey: "nav.settingsShort",
    to: "/app/settings",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </Icon>
    ),
  },
];

// Shared app navigation: a sidebar on wide screens and a fixed bottom bar
// on phones and tablets, where the sidebar links are hidden.
export function AppNavigation({ active, children, currentProject = false, onLogoutError }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      onLogoutError?.(requestError.message);
      setIsLoggingOut(false);
    }
  }

  function itemClass(key, baseClass) {
    return baseClass + (key === active && !(currentProject && key === "projects") ? ` ${baseClass}--active` : "");
  }

  return (
    <>
      <aside className="workspace-sidebar">
        <div>
          <Link className="workspace-brand" to="/"><BrandLogo /></Link>
          {children}
          <nav className="workspace-nav" aria-label={t("nav.workspaceLabel")}>
            {navItems.map((item) => [
              <Link className={itemClass(item.key, "workspace-nav__item")} key={item.key} to={item.to}>{t(item.labelKey)}</Link>,
              currentProject && item.key === "projects" && (
                <span className="workspace-nav__item workspace-nav__item--active" key="current-project">{t("nav.currentProject")}</span>
              ),
            ])}
            {user.isPlatformAdmin && (
              <Link className={itemClass("admin", "workspace-nav__item")} to="/app/admin">{t("nav.admin")}</Link>
            )}
          </nav>
        </div>
        <div className="workspace-user">
          <span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
          <button className="logout-button" disabled={isLoggingOut} onClick={handleLogout} type="button">
            {isLoggingOut ? "..." : t("nav.logout")}
          </button>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label={t("nav.mobileLabel")}>
        {navItems.map((item) => (
          <Link
            aria-current={item.key === active ? "page" : undefined}
            className={"mobile-nav__item" + (item.key === active ? " mobile-nav__item--active" : "")}
            key={item.key}
            to={item.to}
          >
            {item.icon}
            <span>{t(item.shortLabelKey ?? item.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
