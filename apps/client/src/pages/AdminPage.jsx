import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AdminTraffic } from "../components/AdminTraffic.jsx";
import { DailyBarChart, RankingList, StatTile } from "../components/AdminCharts.jsx";
import { fillDays } from "../lib/admin-stats.js";
import { AppNavigation } from "../components/AppNavigation.jsx";
import { useAuth } from "../context/auth-context.js";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { formatFileSize } from "../lib/uploads.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function DeleteUserDialog({ user, onCancel, onDeleted }) {
  const { t } = useLanguage();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsDeleting(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
      });
      onDeleted(user);
    } catch (requestError) {
      setError(requestError.message);
      setIsDeleting(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isDeleting && onCancel()}>
      <section aria-labelledby="admin-delete-title" aria-modal="true" className="dialog-card dialog-card--small" role="alertdialog">
        <header className="dialog-header">
          <div>
            <p className="eyebrow eyebrow--danger">{t("settings.permanentAction")}</p>
            <h2 id="admin-delete-title">{t("admin.deleteTitle")}</h2>
          </div>
          <button aria-label={t("common.closeDialog")} className="dialog-close" disabled={isDeleting} onClick={onCancel} type="button">×</button>
        </header>
        <form className="dialog-form" onSubmit={handleSubmit}>
          <p className="dialog-message">{t("admin.deleteCopy", { name: user.name, email: user.email })}</p>
          {error && <div className="form-message form-message--error" role="alert">{error}</div>}
          <label className="form-field">
            <span>{t("admin.deleteConfirmLabel")}</span>
            <input autoComplete="off" onChange={(event) => setConfirmEmail(event.target.value)} placeholder={user.email} type="email" value={confirmEmail} />
          </label>
          <footer className="dialog-actions">
            <button className="button button--ghost" disabled={isDeleting} onClick={onCancel} type="button">{t("common.cancel")}</button>
            <button className="button button--danger" disabled={!matches || isDeleting} type="submit">
              {isDeleting ? t("common.deleting") : t("admin.deleteSubmit")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState("");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [usersStatus, setUsersStatus] = useState("loading");
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", status: "all", sort: "newest", page: 1 });
  const [workingId, setWorkingId] = useState("");
  const [actionError, setActionError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [logoutError, setLogoutError] = useState("");
  const [now] = useState(() => Date.now());

  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const numberFormatter = new Intl.NumberFormat(locale);

  useEffect(() => {
    if (!user.isPlatformAdmin) return undefined;
    const controller = new AbortController();
    apiRequest("/api/admin/overview", { signal: controller.signal })
      .then((result) => setOverview(result.data))
      .catch((error) => error.name !== "AbortError" && setOverviewError(error.message));
    return () => controller.abort();
  }, [user.isPlatformAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) => (current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!user.isPlatformAdmin) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ status: query.status, sort: query.sort, page: String(query.page), limit: "25" });
    if (query.search) params.set("search", query.search);
    apiRequest(`/api/admin/users?${params}`, { signal: controller.signal })
      .then((result) => {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
        setUsersStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setUsersError(error.message);
          setUsersStatus("error");
        }
      });
    return () => controller.abort();
  }, [query, user.isPlatformAdmin]);

  function relativeTime(value) {
    if (!value) return t("admin.never");
    const days = Math.round((new Date(value).getTime() - now) / DAY_MS);
    if (days === 0) return t("admin.today");
    return relativeFormatter.format(days, "day");
  }

  function countryLabel(code) {
    try {
      return code ? countryNames.of(code) : t("admin.unknown");
    } catch {
      return code;
    }
  }

  async function toggleBlocked(target) {
    setActionError("");
    setWorkingId(target.id);
    try {
      const result = await apiRequest(`/api/admin/users/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ blocked: !target.blockedAt }),
      });
      setUsers((current) => current.map((item) => (item.id === target.id ? { ...item, blockedAt: result.data.user.blockedAt } : item)));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setWorkingId("");
    }
  }

  function handleDeleted(deleted) {
    setUserToDelete(null);
    setUsers((current) => current.filter((item) => item.id !== deleted.id));
    setPagination((current) => current && { ...current, total: current.total - 1 });
  }

  if (!user.isPlatformAdmin) {
    return (
      <div className="workspace-shell">
        <AppNavigation active="admin" onLogoutError={setLogoutError} />
        <main className="workspace-main">
          <div className="content-error" role="alert">
            <h1>{t("admin.noAccessTitle")}</h1>
            <p>{t("admin.noAccessCopy")}</p>
            <Link className="button button--dark" to="/app">{t("project.back")}</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="workspace-shell">
      <AppNavigation active="admin" onLogoutError={setLogoutError} />
      <main className="workspace-main admin-main">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{t("admin.eyebrow")}</p>
            <h1>{t("admin.title")}</h1>
            <p>{t("admin.copy")}</p>
          </div>
        </header>

        {logoutError && <div className="form-message form-message--error" role="alert">{logoutError}</div>}
        {overviewError && <div className="form-message form-message--error" role="alert">{overviewError}</div>}

        {!overview && !overviewError && <div className="board-loading" aria-live="polite">{t("admin.loading")}</div>}

        {overview && (
          <>
            <section aria-label={t("admin.statsLabel")} className="admin-stats">
              <StatTile
                detail={t("admin.usersDetail", { verified: numberFormatter.format(overview.users.verified), blocked: numberFormatter.format(overview.users.blocked) })}
                label={t("admin.users")}
                value={numberFormatter.format(overview.users.total)}
              />
              <StatTile detail={t("admin.active30Detail", { count: numberFormatter.format(overview.users.active30) })} label={t("admin.active7")} value={numberFormatter.format(overview.users.active7)} />
              <StatTile detail={t("admin.workspacesDetail", { count: numberFormatter.format(overview.content.teamWorkspaces) })} label={t("admin.workspaces")} value={numberFormatter.format(overview.content.workspaces)} />
              <StatTile detail={t("admin.tasksDetail", { tasks: numberFormatter.format(overview.content.tasks), events: numberFormatter.format(overview.content.events) })} label={t("nav.projects")} value={numberFormatter.format(overview.content.projects)} />
              <StatTile detail={t("admin.filesDetail", { count: numberFormatter.format(overview.storage.files) })} label={t("admin.storage")} value={formatFileSize(overview.storage.bytes, locale)} />
            </section>

            <section className="admin-panels">
              <DailyBarChart
                series={fillDays(overview.signups, 30, (row) => ({ value: row?.count ?? 0 }))}
                summary={t("admin.signupsTotal", { count: overview.signups.reduce((sum, row) => sum + row.count, 0) })}
                title={t("admin.signupsTitle")}
                tooltip={(day) => [t("admin.signupsOnDay", { count: day.value })]}
              />
              <RankingList items={overview.countries} labelFor={countryLabel} title={t("admin.countries")} />
              <RankingList items={overview.devices} labelFor={(device) => t(`admin.device.${device}`)} title={t("admin.devices")} />
            </section>
          </>
        )}

        <AdminTraffic />

        <section aria-labelledby="admin-users-title" className="admin-users">
          <header className="admin-users__header">
            <h2 id="admin-users-title">{t("admin.usersTitle")}</h2>
            {pagination && <span>{t("admin.usersCount", { count: numberFormatter.format(pagination.total) })}</span>}
          </header>

          <div className="admin-filters">
            <label>
              <span className="visually-hidden">{t("admin.search")}</span>
              <input onChange={(event) => setSearch(event.target.value)} placeholder={t("admin.searchPlaceholder")} type="search" value={search} />
            </label>
            <label>
              <span className="visually-hidden">{t("admin.statusFilter")}</span>
              <select aria-label={t("admin.statusFilter")} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value, page: 1 }))} value={query.status}>
                {["all", "active", "unverified", "blocked", "admins"].map((status) => (
                  <option key={status} value={status}>{t(`admin.status.${status}`)}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">{t("admin.sortLabel")}</span>
              <select aria-label={t("admin.sortLabel")} onChange={(event) => setQuery((current) => ({ ...current, sort: event.target.value, page: 1 }))} value={query.sort}>
                {["newest", "lastActive", "oldest", "name"].map((sort) => (
                  <option key={sort} value={sort}>{t(`admin.sort.${sort}`)}</option>
                ))}
              </select>
            </label>
          </div>

          {actionError && <div className="form-message form-message--error" role="alert">{actionError}</div>}
          {usersStatus === "error" && <div className="form-message form-message--error" role="alert">{usersError}</div>}
          {usersStatus === "ready" && users.length === 0 && <p className="admin-empty">{t("admin.noUsers")}</p>}

          {users.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{t("admin.col.user")}</th>
                    <th scope="col">{t("admin.col.registered")}</th>
                    <th scope="col">{t("admin.col.lastActive")}</th>
                    <th scope="col">{t("admin.col.origin")}</th>
                    <th scope="col">{t("admin.col.usage")}</th>
                    <th scope="col"><span className="visually-hidden">{t("admin.col.actions")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr className={item.blockedAt ? "admin-table__row--blocked" : ""} key={item.id}>
                      <td data-label={t("admin.col.user")}>
                        <strong>{item.name}</strong>
                        <span>{item.email}</span>
                        <span className="admin-badges">
                          {item.isPlatformAdmin && <span className="admin-badge">{t("admin.badge.admin")}</span>}
                          {item.blockedAt && <span className="admin-badge admin-badge--danger">{t("admin.badge.blocked")}</span>}
                          {!item.emailVerifiedAt && <span className="admin-badge admin-badge--muted">{t("admin.badge.unverified")}</span>}
                        </span>
                      </td>
                      <td data-label={t("admin.col.registered")}>{dateFormatter.format(new Date(item.createdAt))}</td>
                      <td data-label={t("admin.col.lastActive")}>{relativeTime(item.lastActiveAt)}</td>
                      <td data-label={t("admin.col.origin")}>
                        {item.lastLoginCountry ? countryLabel(item.lastLoginCountry) : t("admin.unknown")}
                        {item.lastLoginDevice && <span>{t(`admin.device.${item.lastLoginDevice}`)}{item.lastLoginBrowser ? ` · ${item.lastLoginBrowser}` : ""}</span>}
                      </td>
                      <td data-label={t("admin.col.usage")}>
                        {t("admin.usage", { workspaces: item.workspaces, projects: item.projects })}
                        <span>{formatFileSize(item.storageBytes, locale)}</span>
                      </td>
                      <td className="admin-table__actions">
                        {!item.isCurrentUser && !item.isPlatformAdmin && (
                          <>
                            <button className="button button--ghost" disabled={workingId === item.id} onClick={() => toggleBlocked(item)} type="button">
                              {item.blockedAt ? t("admin.unblock") : t("admin.block")}
                            </button>
                            <button className="button button--danger" onClick={() => setUserToDelete(item)} type="button">{t("common.delete")}</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <nav aria-label={t("admin.pagination")} className="admin-pagination">
              <button className="button button--ghost" disabled={query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} type="button">{t("calendar.previous")}</button>
              <span>{t("admin.page", { page: query.page, total: pagination.totalPages })}</span>
              <button className="button button--ghost" disabled={query.page >= pagination.totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} type="button">{t("calendar.next")}</button>
            </nav>
          )}
        </section>
      </main>

      {userToDelete && <DeleteUserDialog onCancel={() => setUserToDelete(null)} onDeleted={handleDeleted} user={userToDelete} />}
    </div>
  );
}
