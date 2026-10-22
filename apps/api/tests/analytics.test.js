import request from "supertest";
import app from "../src/app.js";
import { normalizePath, resetAnalyticsCache, rollupOldPageViews } from "../src/lib/analytics.js";
import prisma from "../src/lib/prisma.js";

const firefox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const admin = { name: "Traffic Admin", email: "traffic-admin@example.com", password: "StrongPass123" };

function visit(body, { ip = "85.214.132.117", userAgent = firefox, headers = {} } = {}) {
  return request(app)
    .post("/api/analytics/pageview")
    .set("User-Agent", userAgent)
    .set("X-Forwarded-For", ip)
    .set(headers)
    .send(body);
}

async function clearAnalytics() {
  await prisma.pageView.deleteMany();
  await prisma.analyticsSalt.deleteMany();
  await prisma.monthlyTraffic.deleteMany();
  resetAnalyticsCache();
}

beforeEach(clearAnalytics);

afterAll(async () => {
  await clearAnalytics();
  await prisma.user.deleteMany({ where: { email: admin.email } });
  await prisma.$disconnect();
});

describe("Recording page views", () => {
  it("stores country, device and browser but never the IP address", async () => {
    const response = await visit({ path: "/", referrer: "https://www.google.com/search?q=ordanly" });

    expect(response.statusCode).toBe(204);
    const [view] = await prisma.pageView.findMany();
    expect(view).toMatchObject({
      path: "/",
      referrerHost: "google.com",
      country: "DE",
      device: "DESKTOP",
      browser: "Firefox",
    });
    expect(view.visitorHash).toHaveLength(32);
    expect(JSON.stringify(view)).not.toContain("85.214.132.117");
  });

  it("removes secret tokens and IDs from paths", async () => {
    await visit({ path: "/invite/abc123secret" });
    await visit({ path: "/reset-password/very-secret-token?x=1" });
    await visit({ path: "/app/projects/6c1d6e4e-1111-4222-8333-444455556666" });
    await visit({ path: "/something/unexpected" });

    const paths = (await prisma.pageView.findMany()).map(({ path }) => path).sort();
    expect(paths).toEqual(["/app/projects/:id", "/invite/:token", "/other", "/reset-password/:token"]);
    expect(JSON.stringify(paths)).not.toContain("secret");
  });

  it("ignores bots and visitors who opt out of tracking", async () => {
    await visit({ path: "/" }, { userAgent: "Googlebot/2.1 (+http://www.google.com/bot.html)" });
    await visit({ path: "/" }, { headers: { DNT: "1" } });
    await visit({ path: "/" }, { headers: { "Sec-GPC": "1" } });

    expect(await prisma.pageView.count()).toBe(0);
  });

  it("does not record its own site as referrer", async () => {
    await visit({ path: "/login", referrer: "https://www.ordanly.com/" });

    const [view] = await prisma.pageView.findMany();
    expect(view.referrerHost).toBeNull();
  });

  it("recognises a visitor within a day but not after the daily salt changes", async () => {
    await visit({ path: "/" });
    await visit({ path: "/login" });
    await visit({ path: "/" }, { ip: "8.8.8.8", userAgent: iphone });

    const views = await prisma.pageView.findMany({ orderBy: { createdAt: "asc" } });
    expect(views[0].visitorHash).toBe(views[1].visitorHash);
    expect(views[2].visitorHash).not.toBe(views[0].visitorHash);

    // A new day brings a new salt: the same person gets an unrelated hash.
    await prisma.analyticsSalt.deleteMany();
    resetAnalyticsCache();
    await visit({ path: "/" });
    const latest = await prisma.pageView.findFirst({ orderBy: { createdAt: "desc" } });
    expect(latest.visitorHash).not.toBe(views[0].visitorHash);
  });

  it("keeps only one salt, the current day's", async () => {
    await prisma.analyticsSalt.create({ data: { day: "2020-01-01", salt: "old" } });
    resetAnalyticsCache();

    await visit({ path: "/" });

    const salts = await prisma.analyticsSalt.findMany();
    expect(salts.map(({ day }) => day)).toEqual([new Date().toISOString().slice(0, 10)]);
  });
});

describe("Retention", () => {
  it("folds page views older than twelve months into monthly totals", async () => {
    const old = new Date(Date.UTC(new Date().getUTCFullYear() - 2, 2, 10));
    const sameDay = new Date(old.getTime() + 60 * 60 * 1000);
    await prisma.pageView.createMany({
      data: [
        { path: "/", visitorHash: "a", createdAt: old },
        { path: "/login", visitorHash: "a", createdAt: sameDay },
        { path: "/", visitorHash: "b", createdAt: old },
        { path: "/", visitorHash: "recent" },
      ],
    });

    await rollupOldPageViews();

    const month = `${old.getUTCFullYear()}-03`;
    expect(await prisma.monthlyTraffic.findUnique({ where: { month } })).toEqual({ month, visitors: 2, pageViews: 3 });
    expect((await prisma.pageView.findMany()).map(({ visitorHash }) => visitorHash)).toEqual(["recent"]);
  });
});

describe("Admin traffic report", () => {
  it("summarises visitors for platform admins only", async () => {
    await prisma.user.deleteMany({ where: { email: admin.email } });
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(admin);
    await agent.post("/api/auth/login").send({ email: admin.email, password: admin.password });

    const denied = await agent.get("/api/admin/traffic");
    expect(denied.statusCode).toBe(403);

    await prisma.user.update({ where: { email: admin.email }, data: { isPlatformAdmin: true } });
    await visit({ path: "/", referrer: "https://instagram.com/ordanly" });
    await visit({ path: "/register" });
    await visit({ path: "/" }, { ip: "8.8.8.8", userAgent: iphone });

    const response = await agent.get("/api/admin/traffic?days=7");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.totals).toMatchObject({ visitors: 2, pageViews: 3, visitorsToday: 2 });
    expect(response.body.data.pages[0]).toEqual({ value: "/", count: 2 });
    expect(response.body.data.referrers).toEqual(expect.arrayContaining([{ value: "instagram.com", count: 1 }]));
    expect(response.body.data.countries).toEqual(expect.arrayContaining([{ value: "DE", count: 1 }, { value: "US", count: 1 }]));
    expect(response.body.data.devices).toEqual(expect.arrayContaining([{ value: "MOBILE", count: 1 }]));
  });

  it("rejects unsupported periods", async () => {
    expect(normalizePath("/app/today?x=1")).toBe("/app/today");
    const response = await request(app).get("/api/admin/traffic?days=3");
    expect(response.statusCode).toBe(401);
  });
});
