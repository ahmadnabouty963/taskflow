import { useState } from "react";
import { useLanguage } from "../context/language-context.js";

export function StatTile({ label, value, detail }) {
  return (
    <div className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

// A single-series column chart: one hue, thin bars on a shared baseline,
// a hover tooltip per day and a hidden table for screen readers.
export function DailyBarChart({ title, summary, series, tooltip }) {
  const { locale, t } = useLanguage();
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...series.map(({ value }) => value));
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const width = 600;
  const height = 160;
  const slot = width / series.length;
  const barWidth = Math.max(1, slot - (slot > 6 ? 3 : 0.5));

  return (
    <figure className="admin-chart">
      <figcaption>
        <strong>{title}</strong>
        <span>{summary}</span>
      </figcaption>
      <div className="admin-chart__plot">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
          {[0.5, 1].map((fraction) => (
            <line className="admin-chart__grid" key={fraction} x1="0" x2={width} y1={height - fraction * height} y2={height - fraction * height} />
          ))}
          <line className="admin-chart__axis" x1="0" x2={width} y1={height} y2={height} />
          {series.map((day, index) => {
            const barHeight = day.value === 0 ? 0 : Math.max(3, (day.value / max) * (height - 8));
            return (
              <g key={day.key} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
                <rect className="admin-chart__hit" height={height} width={slot} x={index * slot} y="0" />
                {barHeight > 0 && (
                  <rect className="admin-chart__bar" height={barHeight} rx={barWidth > 4 ? 2 : 0} width={barWidth} x={index * slot + (slot - barWidth) / 2} y={height - barHeight} />
                )}
              </g>
            );
          })}
        </svg>
        {hovered !== null && (
          <div className="admin-chart__tooltip" role="status" style={{ left: `${((hovered + 0.5) / series.length) * 100}%` }}>
            <span>{dayFormatter.format(series[hovered].date)}</span>
            {tooltip(series[hovered]).map((line) => <strong key={line}>{line}</strong>)}
          </div>
        )}
      </div>
      <div className="admin-chart__labels" aria-hidden="true">
        <span>{dayFormatter.format(series[0].date)}</span>
        <span>{t("nav.today")}</span>
      </div>
      <table className="visually-hidden">
        <caption>{title}</caption>
        <tbody>
          {series.map((day) => (
            <tr key={day.key}><th scope="row">{dayFormatter.format(day.date)}</th><td>{tooltip(day).join(", ")}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function RankingList({ title, items, labelFor }) {
  const { t } = useLanguage();
  const max = Math.max(1, ...items.map(({ count }) => count));
  return (
    <section className="admin-ranking" aria-label={title}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="admin-empty">{t("admin.noData")}</p>
      ) : (
        <ul>
          {items.slice(0, 8).map((item) => (
            <li key={item.value ?? "none"}>
              <span className="admin-ranking__label" title={labelFor(item.value)}>{labelFor(item.value)}</span>
              <span className="admin-ranking__track" aria-hidden="true">
                <span style={{ width: `${(item.count / max) * 100}%` }} />
              </span>
              <span className="admin-ranking__value">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
