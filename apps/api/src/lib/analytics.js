import { createHash, randomBytes } from "node:crypto";
import { countryFromIp, describeUserAgent } from "./client-info.js";
import prisma from "./prisma.js";

const RETENTION_MONTHS = 12;
const ROLLUP_INTERVAL_MS = 60 * 60 * 1000;

// Paths are stored as patterns, so secret tokens and record IDs from links
// such as invitations or password resets never reach the statistics.
const pathPatterns = [
  [/^\/invite\/[^/]+$/, "/invite/:token"],
  [/^\/verify-email\/[^/]+$/, "/verify-email/:token"],
  [/^\/reset-password\/[^/]+$/, "/reset-password/:token"],
  [/^\/app\/projects\/[^/]+$/, "/app/projects/:id"],
  [/^\/app\/workspaces\/[^/]+\/settings$/, "/app/workspaces/:id/settings"],
];

const knownPaths = new Set([
  "/",
  "/login",
  "/register",
  "/check-email",
  "/forgot-password",
  "/impressum",
  "/datenschutz",
  "/app",
  "/app/today",
  "/app/upcoming",
  "/app/calendar",
  "/app/settings",
  "/app/admin",
]);

export function normalizePath(rawPath) {
  const path = String(rawPath).split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (knownPaths.has(path)) return path;
  return pathPatterns.find(([pattern]) => pattern.test(path))?.[1] ?? "/other";
}

const botPattern = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|axios|node-fetch|go-http|java\//i;

export function isBot(userAgent) {
  return !userAgent || botPattern.test(userAgent);
}

function ownHosts() {
  const origins = [process.env.CLIENT_APP_URL, ...(process.env.CLIENT_ORIGINS ?? "").split(",")];
  const hosts = new Set(["ordanly.com", "www.ordanly.com"]);
  for (const origin of origins) {
    try {
      if (origin?.trim()) hosts.add(new URL(origin.trim()).hostname);
    } catch {
      // Ignore malformed origins from configuration.
    }
  }
  return hosts;
}

// Only the referring site's host name is kept, never the full address.
export function referrerHostFrom(referrer) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || ownHosts().has(host) || ownHosts().has(`www.${host}`)) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

const todayKey = () => new Date().toISOString().slice(0, 10);
let cachedSalt = null;
let lastRollup = 0;

// One random salt per UTC day, shared through the database so every API
// instance counts the same visitor once. Older salts are deleted, which
// makes yesterday's hashes impossible to link to today's visitors.
async function dailySalt() {
  const day = todayKey();
  if (cachedSalt?.day === day) return cachedSalt.salt;

  const salt = randomBytes(32).toString("hex");
  const stored = await prisma.analyticsSalt.upsert({
    where: { day },
    update: {},
    create: { day, salt },
  });
  await prisma.analyticsSalt.deleteMany({ where: { day: { lt: day } } });
  cachedSalt = { day, salt: stored.salt };
  return stored.salt;
}

export function resetAnalyticsCache() {
  cachedSalt = null;
  lastRollup = 0;
}

function monthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Folds page views older than the retention period into monthly totals and
// deletes the individual rows. Visitors are the sum of daily unique visitors.
export async function rollupOldPageViews(now = new Date()) {
  const cutoff = monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - RETENTION_MONTHS, 1)));
  const months = await prisma.$queryRaw`
    SELECT to_char(day, 'YYYY-MM') AS month, SUM(visitors)::int AS visitors, SUM(views)::int AS "pageViews"
    FROM (
      SELECT date_trunc('day', "createdAt") AS day,
             COUNT(DISTINCT "visitorHash") AS visitors,
             COUNT(*) AS views
      FROM "PageView"
      WHERE "createdAt" < ${cutoff}
      GROUP BY 1
    ) daily
    GROUP BY 1`;

  if (months.length === 0) return 0;

  await prisma.$transaction([
    ...months.map((row) =>
      prisma.monthlyTraffic.upsert({
        where: { month: row.month },
        update: { visitors: { increment: row.visitors }, pageViews: { increment: row.pageViews } },
        create: { month: row.month, visitors: row.visitors, pageViews: row.pageViews },
      }),
    ),
    prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return months.length;
}

async function rollupIfDue() {
  if (Date.now() - lastRollup < ROLLUP_INTERVAL_MS) return;
  lastRollup = Date.now();
  try {
    await rollupOldPageViews();
  } catch (error) {
    console.error("Could not roll up old page views:", error.message);
  }
}

export async function recordPageView({ path, referrer, ip, userAgent }) {
  const salt = await dailySalt();
  const visitorHash = createHash("sha256")
    .update(`${salt}|${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 32);
  const { browser, device } = describeUserAgent(userAgent);

  await prisma.pageView.create({
    data: {
      path: normalizePath(path),
      referrerHost: referrerHostFrom(referrer),
      country: countryFromIp(ip),
      device,
      browser,
      visitorHash,
    },
  });
  await rollupIfDue();
}
