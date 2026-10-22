import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/language-context.js";
import { apiRequest } from "../lib/api.js";
import { fillDays } from "../lib/admin-stats.js";
import { DailyBarChart, RankingList, StatTile } from "./AdminCharts.jsx";

const periods = [7, 30, 90, 365];

const pathLabelKeys = {
  "/": "admin.path.home",
  "/login": "admin.path.login",
  "/register": "admin.path.register",
  "/check-email": "admin.path.checkEmail",
  "/forgot-password": "admin.path.forgotPassword",
  "/reset-password/:token": "admin.path.resetPassword",
  "/verify-email/:token": "admin.path.verifyEmail",
  "/invite/:token": "admin.path.invite",
  "/impressum": "admin.path.imprint",
  "/datenschutz": "admin.path.privacy",
  "/app": "nav.projects",
  "/app/projects/:id": "admin.path.project",
  "/app/today": "nav.today",
  "/app/upcoming": "nav.upcoming",
  "/app/calendar": "nav.calendar",
  "/app/settings": "nav.settings",
  "/app/admin": "nav.admin",
  "/app/workspaces/:id/settings": "admin.path.workspaceSettings",
  "/other": "admin.path.other",
};

export function AdminTraffic() {
  const { locale, t } = useLanguage();
  const [days, setDays] = useState(30);
  const [traffic, setTraffic] = useState(null);
  const [error, setError] = useState("");

  const numberFormatter = new Intl.NumberFormat(locale);
  const percentFormatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const decimalFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const countryNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/api/admin/traffic?days=${days}`, { signal: controller.signal })
      .then((result) => {
        setTraffic(result.data);
        setError("");
      })
      .catch((requestError) => requestError.name !== "AbortError" && setError(requestError.message));
    return () => controller.abort();
  }, [days]);

  function countryLabel(code) {
    try {
      return code ? countryNames.of(code) : t("admin.unknown");
    } catch {
      return code;
    }
  }

  const totals = traffic?.totals;

  return (
    <section aria-labelledby="admin-traffic-title" className="admin-traffic">
      <header className="admin-users__header">
        <div>
          <h2 id="admin-traffic-title">{t("admin.traffic.title")}</h2>
          <p className="admin-traffic__note">{t("admin.traffic.note")}</p>
        </div>
        <div className="calendar-view-toggle" role="group" aria-label={t("admin.traffic.period")}>
          {periods.map((period) => (
            <button aria-pressed={days === period} className={days === period ? "calendar-toggle--active" : ""} key={period} onClick={() => setDays(period)} type="button">
              {t("admin.traffic.days", { count: period })}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="form-message form-message--error" role="alert">{error}</div>}
      {!traffic && !error && <div className="board-loading" aria-live="polite">{t("admin.loading")}</div>}

      {traffic && (
        <>
          <div aria-label={t("admin.traffic.figures")} className="admin-stats" role="group">
            <StatTile detail={t("admin.traffic.visitorsDetail", { count: traffic.days })} label={t("admin.traffic.visitors")} value={numberFormatter.format(totals.visitors)} />
            <StatTile label={t("admin.traffic.today")} value={numberFormatter.format(totals.visitorsToday)} />
            <StatTile
              detail={totals.visitors ? t("admin.traffic.perVisitor", { count: decimalFormatter.format(totals.pageViews / totals.visitors) }) : null}
              label={t("admin.traffic.pageViews")}
              value={numberFormatter.format(totals.pageViews)}
            />
            <StatTile
              detail={t("admin.traffic.signupsDetail", { count: numberFormatter.format(totals.signups) })}
              label={t("admin.traffic.conversion")}
              value={totals.conversionRate === null ? "–" : percentFormatter.format(totals.conversionRate)}
            />
          </div>

          <div className="admin-panels">
            <DailyBarChart
              series={fillDays(traffic.daily, traffic.days, (row) => ({ value: row?.visitors ?? 0, pageViews: row?.pageViews ?? 0 }))}
              summary={t("admin.traffic.visitorsDetail", { count: traffic.days })}
              title={t("admin.traffic.chartTitle")}
              tooltip={(day) => [t("admin.traffic.visitorsOnDay", { count: day.value }), t("admin.traffic.viewsOnDay", { count: day.pageViews })]}
            />
            <RankingList items={traffic.pages} labelFor={(path) => (pathLabelKeys[path] ? t(pathLabelKeys[path]) : path)} title={t("admin.traffic.pages")} />
            <RankingList items={traffic.referrers} labelFor={(host) => host ?? t("admin.traffic.direct")} title={t("admin.traffic.referrers")} />
          </div>

          <div className="admin-panels admin-panels--three">
            <RankingList items={traffic.countries} labelFor={countryLabel} title={t("admin.traffic.countries")} />
            <RankingList items={traffic.devices} labelFor={(device) => (device ? t(`admin.device.${device}`) : t("admin.unknown"))} title={t("admin.traffic.devices")} />
            <RankingList items={traffic.browsers} labelFor={(browser) => browser ?? t("admin.unknown")} title={t("admin.traffic.browsers")} />
          </div>

          {traffic.monthly.length > 0 && (
            <div className="admin-table-wrap admin-traffic__archive">
              <table className="admin-table">
                <caption className="visually-hidden">{t("admin.traffic.archive")}</caption>
                <thead>
                  <tr><th scope="col">{t("admin.traffic.month")}</th><th scope="col">{t("admin.traffic.visitors")}</th><th scope="col">{t("admin.traffic.pageViews")}</th></tr>
                </thead>
                <tbody>
                  {traffic.monthly.map((row) => (
                    <tr key={row.month}>
                      <td data-label={t("admin.traffic.month")}>{new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${row.month}-15`))}</td>
                      <td data-label={t("admin.traffic.visitors")}>{numberFormatter.format(row.visitors)}</td>
                      <td data-label={t("admin.traffic.pageViews")}>{numberFormatter.format(row.pageViews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
