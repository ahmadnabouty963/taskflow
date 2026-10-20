import { Router } from "express";
import {
  createEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "../controllers/event.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validateBody.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import {
  createEventSchema,
  eventIdParamsSchema,
  eventRangeQuerySchema,
  updateEventSchema,
} from "../schemas/event.schema.js";

const eventRouter = Router();

eventRouter.use(authenticate);
eventRouter.get("/", validateQuery(eventRangeQuerySchema), getEvents);
eventRouter.post("/", validateBody(createEventSchema), createEvent);
eventRouter.patch(
  "/:eventId",
  validateParams(eventIdParamsSchema),
  validateBody(updateEventSchema),
  updateEvent,
);
eventRouter.delete(
  "/:eventId",
  validateParams(eventIdParamsSchema),
  deleteEvent,
);

export default eventRouter;
