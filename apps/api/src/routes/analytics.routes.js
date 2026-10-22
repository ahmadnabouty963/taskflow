import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { trackPageView } from "../controllers/analytics.controller.js";
import { validateBody } from "../middleware/validateBody.js";
import { pageViewSchema } from "../schemas/analytics.schema.js";

// Page views come from every visitor, including guests, so they have their
// own generous limit instead of using up the normal API allowance.
const pageViewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ANALYTICS_RATE_LIMIT_MAX ?? 200),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (request, response) => response.status(204).send(),
});

const analyticsRouter = Router();

analyticsRouter.post("/pageview", pageViewLimiter, validateBody(pageViewSchema), trackPageView);

export default analyticsRouter;
