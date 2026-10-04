import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

const allowedOrigins = (
  process.env.CLIENT_ORIGINS ?? "http://localhost:5500,http://localhost:5501"
)
  .split(",")
  .map((origin) => origin.trim());

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (request, response) => {
  return response.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "taskflow-api",
    },
  });
});

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/projects/:projectId/tasks", taskRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
