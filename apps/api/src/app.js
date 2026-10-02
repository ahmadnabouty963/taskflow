import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import projectRouter from "./routes/project.routes.js";
const app = express();

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

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use(errorHandler);

export default app;
