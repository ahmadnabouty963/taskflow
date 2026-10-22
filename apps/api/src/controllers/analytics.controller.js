import { isBot, recordPageView } from "../lib/analytics.js";

// Visitors who ask not to be tracked (Do Not Track or Global Privacy
// Control) and automated clients are not counted. The answer is the same
// either way, so the response reveals nothing about what was stored.
export async function trackPageView(request, response, next) {
  try {
    const userAgent = request.get("user-agent");
    const optedOut = request.get("dnt") === "1" || request.get("sec-gpc") === "1";

    if (!optedOut && !isBot(userAgent)) {
      await recordPageView({
        path: request.body.path,
        referrer: request.body.referrer,
        ip: request.ip,
        userAgent,
      });
    }

    return response.status(204).send();
  } catch (error) {
    next(error);
  }
}
